import admin from '../admin/firebaseAdmin';
import {ToggleVoteResponse} from '../types/CommentsReplies';
import {Reply, GetRepliesResponse} from '../types/Reply';

const replyCollection = 'communityPost';

export const createReply = async (reply: Omit<Reply, 'id'>, type = replyCollection): Promise<Reply> => {
  const replyRef = admin.firestore().collection(`${type}Replies`).doc();
  const newReply: Reply = {...reply, id: replyRef.id};
  await replyRef.set(newReply);
  const postRef = admin.firestore().collection(`${type}Comments`).doc(reply.commentId);
  await postRef.update({replyCount: admin.firestore.FieldValue.increment(1)});
  return newReply;
};

export const updateReply = async (
  replyId: string,
  updatedData: Partial<Reply>,
  type = replyCollection
): Promise<FirebaseFirestore.DocumentSnapshot<Reply>> => {
  const replyRef = admin.firestore().collection(`${type}Replies`).doc(replyId);
  await replyRef.update(updatedData);
  return replyRef.get() as unknown as FirebaseFirestore.DocumentSnapshot<Reply>;
};

export const deleteReply = async (replyId: string, type = replyCollection): Promise<void> => {
  const replyRef = admin.firestore().collection(`${type}Replies`).doc(replyId);
  const replyDoc = await replyRef.get();
  await replyRef.delete();
  const postRef = admin.firestore().collection(`${type}Comments`).doc(replyDoc.data()?.commentId);
  await postRef.update({replyCount: admin.firestore.FieldValue.increment(-1)});
};

export const deleteAllReplies = async (postId: string, type = replyCollection): Promise<number> => {
  const repliesRef = admin.firestore().collection(`${type}Replies`);

  const postReplies = await repliesRef
    .where('postId', '==', postId)
    .get();

  const batch = admin.firestore().batch();

  postReplies.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  return postReplies.size;
};

export const getReplies = async (
  commentId: string,
  pageSize: number,
  lastVisible: string | undefined,
  type = replyCollection
): Promise<GetRepliesResponse> => {
  let query = admin.firestore()
    .collection(`${type}Replies`)
    .where('commentId', '==', commentId)
    .where('deleted', '==', false)
    .orderBy('createdAt', 'desc')
    .limit(pageSize);

  if (lastVisible) {
    const lastVisibleDoc = await admin.firestore().collection(`${type}Replies`).doc(lastVisible).get();
    if (lastVisibleDoc.exists) {
      query = query.startAfter(lastVisibleDoc);
    } else {
      throw new Error('Invalid lastVisible document ID.');
    }
  }

  const snapshot = await query.get();
  const replies: Reply[] = snapshot.docs.map((doc) => doc.data() as Reply);

  return {
    replies,
    lastVisible: snapshot.docs[snapshot.docs.length - 1]?.id || null,
    hasMore: replies.length === pageSize,
  };
};

export const getReply = async (replyId: string, type = replyCollection): Promise<Reply> => {
  const replyRef = admin.firestore().collection(`${type}Replies`).doc(replyId);
  const replyDoc = await replyRef.get();
  if (!replyDoc.exists) {
    throw new Error('Reply not found.');
  }
  return replyDoc.data() as Reply;
};

export const toggleReplyVote = async (
  replyId: string,
  userId: string,
  type = replyCollection
): Promise<ToggleVoteResponse> => {
  const replyRef = admin.firestore().collection(`${type}Replies`).doc(replyId);
  const replyDoc = await replyRef.get();

  if (!replyDoc.exists) {
    throw new Error('Reply not found.');
  }

  const replyData = replyDoc.data() as Reply;
  const likes = replyData.likes || [];

  if (likes.includes(userId)) {
    await replyRef.update({likes: admin.firestore.FieldValue.arrayRemove(userId)});
    return {message: 'Reply unliked successfully'};
  } else {
    await replyRef.update({likes: admin.firestore.FieldValue.arrayUnion(userId)});
    return {message: 'Reply liked successfully'};
  }
};
