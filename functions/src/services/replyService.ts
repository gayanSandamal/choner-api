import admin from "../admin/firebaseAdmin";
import {ToggleVoteResponse} from "../types/CommentsReplies";
import {Reply, GetRepliesResponse} from "../types/Reply";

const replyCollection = "communityPost";

export const createReply = async (reply: Omit<Reply, "id">): Promise<Reply> => {
  const replyRef = admin.firestore().collection(`${replyCollection}Replies`).doc();
  const newReply: Reply = {...reply, id: replyRef.id};
  await replyRef.set(newReply);
  return newReply;
};

export const updateReply = async (
  replyId: string,
  updatedData: Partial<Reply>
): Promise<FirebaseFirestore.DocumentSnapshot<Reply>> => {
  const replyRef = admin.firestore().collection(`${replyCollection}Replies`).doc(replyId);
  await replyRef.update(updatedData);
  return replyRef.get() as unknown as FirebaseFirestore.DocumentSnapshot<Reply>;
};

export const deleteReply = async (replyId: string): Promise<void> => {
  const replyRef = admin.firestore().collection(`${replyCollection}Replies`).doc(replyId);
  await replyRef.delete();
};

export const getReplies = async (
  commentId: string,
  pageSize: number,
  lastVisible: string | undefined
): Promise<GetRepliesResponse> => {
  let query = admin.firestore()
    .collection(`${replyCollection}Replies`)
    .where("commentId", "==", commentId)
    .orderBy("createdAt", "desc")
    .limit(pageSize);

  if (lastVisible) {
    const lastVisibleDoc = await admin.firestore().collection(`${replyCollection}Replies`).doc(lastVisible).get();
    if (lastVisibleDoc.exists) {
      query = query.startAfter(lastVisibleDoc);
    } else {
      throw new Error("Invalid lastVisible document ID.");
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

export const toggleReplyVote = async (
  replyId: string,
  userId: string
): Promise<ToggleVoteResponse> => {
  const replyRef = admin.firestore().collection(`${replyCollection}Replies`).doc(replyId);
  const replyDoc = await replyRef.get();

  if (!replyDoc.exists) {
    throw new Error("Reply not found.");
  }

  const replyData = replyDoc.data() as Reply;
  const likes = replyData.likes || [];

  if (likes.includes(userId)) {
    await replyRef.update({likes: admin.firestore.FieldValue.arrayRemove(userId)});
    return {message: "Reply unliked successfully"};
  } else {
    await replyRef.update({likes: admin.firestore.FieldValue.arrayUnion(userId)});
    return {message: "Reply liked successfully"};
  }
};
