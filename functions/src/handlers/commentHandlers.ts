import * as functions from 'firebase-functions';
import admin from './../admin/firebaseAdmin';
import {getAuthenticatedUser} from '../utils/authUtils';
import {createComment, updateComment, deleteComment, getComments} from '../services/commentService';
import {handleError} from '../utils/errorHandler';
import {Comment, GetPaginatedCommentsResponse} from '../types/Comment';
import {now} from '../utils/commonUtils';
import {deleteAllRepliesForComment} from './replyHandlers';

const COLLECTION = 'communityPost';

// Create Comment Handler
export const createCommentHandler = functions.https.onCall(async (data, context) => {
  try {
    const user = await getAuthenticatedUser(context);

    const {postId, comment, type} = data;

    if (!postId || !comment) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: commentId or comment.');
    }

    const newComment: Comment = {
      postId: postId,
      comment: comment,
      createdBy: {
        uid: user.uid,
        displayName: user.displayName,
        profileImageUrl: user.profileImageUrl,
      },
      createdAt: now,
      deleted: false,
      id: '',
    };

    const createdComment = await createComment(newComment, type);
    return {message: 'Comment created successfully', data: createdComment};
  } catch (error) {
    return handleError(error);
  }
});

// Update Comment Handler
export const updateCommentHandler = functions.https.onCall(async (data, context) => {
  try {
    const user = await getAuthenticatedUser(context);

    const {commentId, comment, type} = data;

    if (!commentId || !comment) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: commentId or comment.');
    }

    // Fetch the existing comment to verify ownership
    const existingCommentDoc = await admin.firestore().collection(`${type || COLLECTION}Comments`).doc(commentId).get();

    if (!existingCommentDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Comment not found.');
    }

    const existingComment = existingCommentDoc.data() as Comment;

    if (existingComment.createdBy.uid !== user.uid) {
      throw new functions.https.HttpsError('permission-denied', 'You do not have permission to update this comment.');
    }

    const updatedData: Partial<Comment> = {
      comment,
      updatedAt: now,
    };

    const updatedCommentDoc = await updateComment(commentId, updatedData, type);
    return {
      message: 'Comment updated successfully',
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

    const {postId, commentId, type} = data;

    if (!commentId || !postId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required field: commentId.');
    }

    // Fetch the existing comment to verify ownership
    const existingCommentDoc = await admin.firestore().collection(`${type || COLLECTION}Comments`).doc(commentId).get();

    if (!existingCommentDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Comment not found.');
    }

    const existingComment = existingCommentDoc.data() as Comment;

    if (existingComment.createdBy.uid !== user.uid) {
      throw new functions.https.HttpsError('permission-denied', 'You do not have permission to delete this comment.');
    }

    await deleteComment(commentId, type);

    const deletedReplyCount = await deleteAllRepliesForComment(postId, commentId, type);

    return {message: `Comment and ${deletedReplyCount} replies have been deleted successfully`};
  } catch (error) {
    return handleError(error);
  }
});

export const deleteAllCommentsHandler = async (postId: string, type: string): Promise<number> => {
  try {
    if (!postId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required field: postId.');
    }

    const comments = await admin.firestore().collection(`${type || COLLECTION}Comments`).where('postId', '==', postId).get();
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
    const {postId, pageSize = 10, lastVisible, type} = data;

    if (!postId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required field: postId.');
    }

    const response: GetPaginatedCommentsResponse = await getComments(postId, pageSize, lastVisible, type);

    return response;
  } catch (error) {
    return handleError(error);
  }
});

// Vote/Upvote Comment Handler
export const voteUpvoteCommentHandler = functions.https.onCall(async (data, context) => {
  try {
    const user = await getAuthenticatedUser(context);
    const {commentId, type} = data;

    if (!commentId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required field: commentId.');
    }

    const commentRef = admin.firestore().collection(`${type || COLLECTION}Comments`).doc(commentId);
    const commentDoc = await commentRef.get();

    if (!commentDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Comment not found.');
    }

    const commentData = commentDoc.data();
    const likes = commentData?.likes || [];

    if (likes.includes(user.uid)) {
      await commentRef.update({likes: admin.firestore.FieldValue.arrayRemove(user.uid)});
      return {message: 'Comment unliked successfully'};
    } else {
      await commentRef.update({likes: admin.firestore.FieldValue.arrayUnion(user.uid)});
      return {message: 'Comment liked successfully'};
    }
  } catch (error) {
    return handleError(error);
  }
});
