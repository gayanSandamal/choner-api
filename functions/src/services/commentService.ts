import admin from '../admin/firebaseAdmin';
import {Comment, GetPaginatedCommentsResponse} from '../types/Comment';
import {ToggleVoteResponse} from '../types/CommentsReplies';
import {splitCamelCase} from '../utils/commonUtils';

const commentCollection = 'communityPost';

export const createComment = async (comment: Omit<Comment, 'id'>, type = commentCollection): Promise<Comment> => {
  const commentRef = admin.firestore().collection(`${type}Comments`).doc();
  const newComment: Comment = {...comment, id: commentRef.id};
  await commentRef.set(newComment);
  const collectionName = splitCamelCase(type)[0];
  const postRef = admin.firestore().collection(collectionName).doc(comment.postId);
  await postRef.update({commentCount: admin.firestore.FieldValue.increment(1)});
  return newComment;
};

export const updateComment = async (
  commentId: string,
  updatedData: Partial<Comment>,
  type = commentCollection
): Promise<FirebaseFirestore.DocumentSnapshot<Comment>> => {
  const commentRef = admin.firestore().collection(`${type}Comments`).doc(commentId);
  await commentRef.update(updatedData);
  return commentRef.get() as unknown as FirebaseFirestore.DocumentSnapshot<Comment>;
};

export const deleteComment = async (commentId: string, type: string): Promise<void> => {
  const commentRef = admin.firestore().collection(`${type}Comments`).doc(commentId);
  const commentDoc = await commentRef.get();
  await commentRef.delete();
  const collectionName = splitCamelCase(type)[0];
  const postRef = admin.firestore().collection(collectionName).doc(commentDoc.data()?.postId);
  await postRef.update({commentCount: admin.firestore.FieldValue.increment(-1)});
};

export const getComments = async (
  postId: string,
  pageSize: number,
  lastVisible: string | undefined,
  type = commentCollection
): Promise<GetPaginatedCommentsResponse> => {
  let query = admin.firestore()
    .collection(`${type}Comments`)
    .where('postId', '==', postId)
    .where('deleted', '==', false)
    .orderBy('createdAt', 'desc')
    .limit(pageSize);

  if (lastVisible) {
    const lastVisibleDoc = await admin.firestore().collection(`${type}Comments`).doc(lastVisible).get();
    if (lastVisibleDoc.exists) {
      query = query.startAfter(lastVisibleDoc);
    } else {
      throw new Error('Invalid lastVisible document ID.');
    }
  }

  const snapshot = await query.get();
  const comments: Comment[] = snapshot.docs.map((doc) => doc.data() as Comment);

  return {
    comments,
    lastVisible: snapshot.docs[snapshot.docs.length - 1]?.id || null,
    hasMore: comments.length === pageSize,
  };
};

export const toggleCommentVote = async (
  commentId: string,
  userId: string,
  type = commentCollection
): Promise<ToggleVoteResponse> => {
  const commentRef = admin.firestore().collection(`${type}Comments`).doc(commentId);
  const commentDoc = await commentRef.get();

  if (!commentDoc.exists) {
    throw new Error('Comment not found.');
  }

  const commentData = commentDoc.data() as Comment;
  const likes = commentData.likes || [];

  if (likes.includes(userId)) {
    await commentRef.update({likes: admin.firestore.FieldValue.arrayRemove(userId)});
    return {message: 'Comment unliked successfully'};
  } else {
    await commentRef.update({likes: admin.firestore.FieldValue.arrayUnion(userId)});
    return {message: 'Comment liked successfully'};
  }
};
