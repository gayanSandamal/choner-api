/* eslint-disable */
import * as functions from 'firebase-functions';
import admin from './../admin/firebaseAdmin';
import { getAuthenticatedUser } from '../utils/authUtils';
import { handleError } from '../utils/errorHandler';
import {
    createReply,
    updateReply,
    deleteReply,
    getReplies,
    toggleReplyVote,
} from '../services/replyService';
import { Reply, GetRepliesResponse, ToggleVoteResponse } from '../types/Reply';

const REPLY_COLLECTION = 'communityPostReplies';

// Create Reply Handler
export const createReplyHandler = functions.https.onCall(async (data, context) => {
    try {
        const user = await getAuthenticatedUser(context);
        const { commentId, reply } = data;

        if (!commentId || !reply) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: commentId or reply.');
        }

        const newReply: Omit<Reply, 'id'> = {
            commentId,
            reply,
            createdBy: {
                uid: user.uid,
                displayName: user.displayName,
                profileImageUrl: user.profileImageUrl,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
        };

        const createdReply = await createReply(newReply);
        return { message: 'Reply created successfully', data: createdReply };
    } catch (error) {
        return handleError(error);
    }
});

// Update Reply Handler with Ownership Check
export const updateReplyHandler = functions.https.onCall(async (data, context) => {
    try {
        const user = await getAuthenticatedUser(context);
        const { replyId, reply } = data;

        if (!replyId || !reply) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: replyId or reply.');
        }

        // Fetch the existing reply to verify ownership
        const existingReplyDoc = await admin.firestore().collection(REPLY_COLLECTION).doc(replyId).get();

        if (!existingReplyDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Reply not found.');
        }

        const existingReply = existingReplyDoc.data() as Reply;

        if (existingReply.createdBy.uid !== user.uid) {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to update this reply.');
        }

        const updatedData: Partial<Reply> = {
            reply,
            updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
        };

        const updatedReplyDoc = await updateReply(replyId, updatedData);
        return { message: 'Reply updated successfully', data: updatedReplyDoc.data() };
    } catch (error) {
        return handleError(error);
    }
});

// Delete Reply Handler with Ownership Check
export const deleteReplyHandler = functions.https.onCall(async (data, context) => {
    try {
        const user = await getAuthenticatedUser(context);
        const { replyId } = data;

        if (!replyId) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required field: replyId.');
        }

        // Fetch the existing reply to verify ownership
        const existingReplyDoc = await admin.firestore().collection(REPLY_COLLECTION).doc(replyId).get();

        if (!existingReplyDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Reply not found.');
        }

        const existingReply = existingReplyDoc.data() as Reply;

        if (existingReply.createdBy.uid !== user.uid) {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to delete this reply.');
        }

        await deleteReply(replyId);
        return { message: 'Reply deleted successfully' };
    } catch (error) {
        return handleError(error);
    }
});

// Get Replies Handler
export const getRepliesHandler = functions.https.onCall(async (data, context) => {
    try {
        const { commentId, pageSize = 10, lastVisible } = data;

        if (!commentId) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required field: commentId.');
        }

        const replies: GetRepliesResponse = await getReplies(commentId, pageSize, lastVisible);
        return replies;
    } catch (error) {
        return handleError(error);
    }
});

// Vote/Upvote Reply Handler
export const voteUpvoteReplyHandler = functions.https.onCall(async (data, context) => {
    try {
        const user = await getAuthenticatedUser(context);
        const { replyId } = data;

        if (!replyId) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required field: replyId.');
        }

        const result: ToggleVoteResponse = await toggleReplyVote(replyId, user.uid);
        return result;
    } catch (error) {
        return handleError(error);
    }
});

