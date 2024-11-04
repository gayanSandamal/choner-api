import * as functions from "firebase-functions";
import admin from "./../admin/firebaseAdmin";
import {getAuthenticatedUser} from "../utils/authUtils";
import {createComment, updateComment, deleteComment} from "../services/commentService";
import {handleError} from "../utils/errorHandler";
import {Comment} from "../types/Comment";
import {now} from "../utils/commonUtils";
import { deleteAllRepliesForComment } from "./replyHandlers";

const COLLECTION = "communityPostComments";

// Create Comment Handler
export const createCommentHandler = functions.https.onCall(async (data, context) => {
  try {
    const user = await getAuthenticatedUser(context);

    const newComment: Comment = {
      postId: data.postId,
      comment: data.comment,
      createdBy: {
        uid: user.uid,
        displayName: user.displayName,
        profileImageUrl: user.profileImageUrl,
      },
      createdAt: now,
      deleted: false,
      id: "",
    };

    const createdComment = await createComment(newComment);
    return {message: "Comment created successfully", data: createdComment};
  } catch (error) {
    return handleError(error);
  }
});

// Update Comment Handler
export const updateCommentHandler = functions.https.onCall(async (data, context) => {
  try {
    const user = await getAuthenticatedUser(context);

    const {commentId, comment} = data;

    if (!commentId || !comment) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required fields: commentId or comment.");
    }

    // Fetch the existing comment to verify ownership
    const existingCommentDoc = await admin.firestore().collection(COLLECTION).doc(commentId).get();

    if (!existingCommentDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Comment not found.");
    }

    const existingComment = existingCommentDoc.data() as Comment;

    if (existingComment.createdBy.uid !== user.uid) {
      throw new functions.https.HttpsError("permission-denied", "You do not have permission to update this comment.");
    }

    const updatedData: Partial<Comment> = {
      comment,
      updatedAt: now,
    };

    const updatedCommentDoc = await updateComment(commentId, updatedData);
    return {
      message: "Comment updated successfully",
      data: updatedCommentDoc.data(),
    };
  } catch (error) {
    return handleError(error);
  }
});

// Delete Comment Handler
export const deleteCommentHandler = functions.https.onCall(async (data, context) => {
  try {
    const user = await getAuthenticatedUser(context);

    const {postId, commentId} = data;

    if (!commentId || !postId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required field: commentId.");
    }

    // Fetch the existing comment to verify ownership
    const existingCommentDoc = await admin.firestore().collection(COLLECTION).doc(commentId).get();

    if (!existingCommentDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Comment not found.");
    }

    const existingComment = existingCommentDoc.data() as Comment;

    if (existingComment.createdBy.uid !== user.uid) {
      throw new functions.https.HttpsError("permission-denied", "You do not have permission to delete this comment.");
    }

    await deleteComment(commentId);

    const deletedReplyCount = await deleteAllRepliesForComment(postId, commentId);

    return {message: `Comment and ${deletedReplyCount} replies have been deleted successfully`};
  } catch (error) {
    return handleError(error);
  }
});

export const deleteAllCommentsHandler = async (postId: string): Promise<number> => {
  try {
    if (!postId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required field: postId.");
    }

    const comments = await admin.firestore().collection(COLLECTION).where("postId", "==", postId).get();
    const batch = admin.firestore().batch();

    comments.docs.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();
    return comments.docs.length;
  } catch (error) {
    return handleError(error);
  }
};

// Get Comments Handler
export const getCommentsHandler = functions.https.onCall(async (data) => {
  try {
    const {postId, pageSize = 10, lastVisible} = data;

    if (!postId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required field: postId.");
    }

    let query = admin.firestore().collection(COLLECTION)
      .where("postId", "==", postId)
      .orderBy("createdAt", "desc")
      .limit(pageSize);

    if (lastVisible) {
      const lastVisibleDoc = await admin.firestore().collection(COLLECTION).doc(lastVisible).get();
      if (lastVisibleDoc.exists) {
        query = query.startAfter(lastVisibleDoc);
      } else {
        throw new functions.https.HttpsError("invalid-argument", "Invalid lastVisible document ID.");
      }
    }

    const snapshot = await query.get();
    const comments = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));

    return {comments, lastVisible: snapshot.docs[snapshot.docs.length - 1]?.id || null, hasMore: comments.length === pageSize};
  } catch (error) {
    return handleError(error);
  }
});

// Vote/Upvote Comment Handler
export const voteUpvoteCommentHandler = functions.https.onCall(async (data, context) => {
  try {
    const user = await getAuthenticatedUser(context);
    const {commentId} = data;

    if (!commentId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required field: commentId.");
    }

    const commentRef = admin.firestore().collection(COLLECTION).doc(commentId);
    const commentDoc = await commentRef.get();

    if (!commentDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Comment not found.");
    }

    const commentData = commentDoc.data();
    const likes = commentData?.likes || [];

    if (likes.includes(user.uid)) {
      await commentRef.update({likes: admin.firestore.FieldValue.arrayRemove(user.uid)});
      return {message: "Comment unliked successfully"};
    } else {
      await commentRef.update({likes: admin.firestore.FieldValue.arrayUnion(user.uid)});
      return {message: "Comment liked successfully"};
    }
  } catch (error) {
    return handleError(error);
  }
});
