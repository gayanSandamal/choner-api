import * as functions from 'firebase-functions';
import {getCreatedUserDTO} from '../utils/authUtils';
import {handleError} from '../utils/errorHandler';
import {
  createReply,
  updateReply,
  deleteReply,
  getReplies,
  toggleReplyVote,
  deleteAllReplies,
  getReply,
} from '../services/replyService';
import {Reply, GetRepliesResponse} from '../types/Reply';
import {ToggleVoteResponse} from '../types/CommentsReplies';
import {now, updatedTime} from '../utils/commonUtils';
import {UserInfo} from '../types/User';

// Create Reply Handler
export const createReplyHandler = functions.https.onCall(async (data, context) => {
  try {
    const {postId, commentId, reply, type} = data;

    if (!commentId || !reply) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: commentId or reply.');
    }

    const newReply: Omit<Reply, 'id'> = {
      postId,
      commentId,
      reply,
      createdBy: getCreatedUserDTO(context?.auth as unknown as UserInfo),
      deleted: false,
      createdAt: now,
    };

    const createdReply = await createReply(newReply, type);
    return {
      message: 'Reply created successfully',
      data: createdReply,
    };
  } catch (error) {
    return handleError(error);
  }
});

// Update Reply Handler with Ownership Check
export const updateReplyHandler = functions.https.onCall(async (data, context) => {
  try {
    const {replyId, reply, type} = data;

    if (!replyId || !reply) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: replyId or reply.');
    }

    const existingReply = await getReply(replyId, type);
    if (!existingReply) {
      throw new functions.https.HttpsError('not-found', 'Interest post not found.');
    }

    if (existingReply.createdBy.uid !== context?.auth?.uid) {
      throw new functions.https.HttpsError('permission-denied', 'You do not have permission to update this interest post.');
    }

    const updatedData: Partial<Reply> = {
      reply,
      updatedAt: updatedTime,
    };

    const updatedReplyDoc = await updateReply(replyId, updatedData, type);
    return {
      message: 'Reply updated successfully',
      data: updatedReplyDoc.data(),
    };
  } catch (error) {
    return handleError(error);
  }
});

// Delete Reply Handler with Ownership Check
export const deleteReplyHandler = functions.https.onCall(async (data, context) => {
  try {
    const {replyId, type} = data;

    if (!replyId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required field: replyId.');
    }

    const existingReply = await getReply(replyId, type);
    if (!existingReply) {
      throw new functions.https.HttpsError('not-found', 'Interest post not found.');
    }

    if (existingReply.createdBy.uid !== context?.auth?.uid) {
      throw new functions.https.HttpsError('permission-denied', 'You do not have permission to delete this interest post.');
    }

    await deleteReply(replyId, type);
    return {message: 'Reply deleted successfully'};
  } catch (error) {
    return handleError(error);
  }
});

export const deleteAllRepliesForComment = async (postId: string, commentId: string, type: string): Promise<number> => {
  try {
    if (!commentId || !postId) {
      throw new Error('Missing required field: commentId.');
    }

    const commentRepliesSize = await deleteAllReplies(postId, type);
    return commentRepliesSize;
  } catch (error) {
    return handleError(error);
  }
};

// Get Replies Handler
export const getRepliesHandler = functions.https.onCall(async (data) => {
  try {
    const {commentId, pageSize = 10, lastVisible, type} = data;

    if (!commentId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required field: commentId.');
    }

    const replies: GetRepliesResponse = await getReplies(commentId, pageSize, lastVisible, type);
    return replies;
  } catch (error) {
    return handleError(error);
  }
});

// Vote/Upvote Reply Handler
export const voteUpvoteReplyHandler = functions.https.onCall(async (data, context) => {
  try {
    const {replyId} = data;

    if (!replyId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required field: replyId.');
    }

    const result: ToggleVoteResponse = await toggleReplyVote(replyId, context.auth?.uid || '');
    return result;
  } catch (error) {
    return handleError(error);
  }
});

