/* eslint-disable */
import admin from '../admin/firebaseAdmin';
import { Comment, GetCommentsResponse } from '../types/Comment';
import { ToggleVoteResponse } from '../types/CommentsReplies';

const commentCollection = 'communityPost';

export const createComment = async (comment: Omit<Comment, 'id'>): Promise<Comment> => {
    const commentRef = admin.firestore().collection(`${commentCollection}Comments`).doc();
    const newComment: Comment = { ...comment, id: commentRef.id };
    await commentRef.set(newComment);
    return newComment;
};

export const updateComment = async (
    commentId: string,
    updatedData: Partial<Comment>
): Promise<FirebaseFirestore.DocumentSnapshot<Comment>> => {
    const commentRef = admin.firestore().collection(`${commentCollection}Comments`).doc(commentId);
    await commentRef.update(updatedData);
    return commentRef.get() as unknown as FirebaseFirestore.DocumentSnapshot<Comment>;
};

export const deleteComment = async (commentId: string): Promise<void> => {
    const commentRef = admin.firestore().collection(`${commentCollection}Comments`).doc(commentId);
    await commentRef.delete();
};

export const getComments = async (
    postId: string,
    pageSize: number,
    lastVisible: string | undefined
): Promise<GetCommentsResponse> => {
    let query = admin.firestore()
        .collection(`${commentCollection}Comments`)
        .where('postId', '==', postId)
        .where('deleted', '==', false)
        .orderBy('createdAt', 'desc')
        .limit(pageSize);

    if (lastVisible) {
        const lastVisibleDoc = await admin.firestore().collection(`${commentCollection}Comments`).doc(lastVisible).get();
        if (lastVisibleDoc.exists) {
            query = query.startAfter(lastVisibleDoc);
        } else {
            throw new Error('Invalid lastVisible document ID.');
        }
    }

    const snapshot = await query.get();
    const comments: Comment[] = snapshot.docs.map(doc => doc.data() as Comment);

    return {
        comments,
        lastVisible: snapshot.docs[snapshot.docs.length - 1]?.id || null,
        hasMore: comments.length === pageSize,
    };
};

export const toggleCommentVote = async (
    commentId: string,
    userId: string
): Promise<ToggleVoteResponse> => {
    const commentRef = admin.firestore().collection(`${commentCollection}Comments`).doc(commentId);
    const commentDoc = await commentRef.get();

    if (!commentDoc.exists) {
        throw new Error('Comment not found.');
    }

    const commentData = commentDoc.data() as Comment;
    const likes = commentData.likes || [];

    if (likes.includes(userId)) {
        await commentRef.update({ likes: admin.firestore.FieldValue.arrayRemove(userId) });
        return { message: 'Comment unliked successfully' };
    } else {
        await commentRef.update({ likes: admin.firestore.FieldValue.arrayUnion(userId) });
        return { message: 'Comment liked successfully' };
    }
};
