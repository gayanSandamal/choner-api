// src/handlers/communityHandlers.ts
import * as functions from 'firebase-functions';
import { getAuthenticatedUser } from '../utils/authUtils';
import { handleError } from '../utils/errorHandler';
import {
    createCommunityPost,
    updateCommunityPost,
    deleteCommunityPost,
    getCommunityPost,
    getPaginatedCommunityPosts,
    getPaginatedUserSpecificCommunityPosts,
    publishScheduledCommunityPosts,
} from '../services/communityService';
import { CommunityPost, CommunityPostType, GetPaginatedCommunityPostsResponse } from '../types/Community';
import admin from '../admin/firebaseAdmin';
import { PostVisibilityStatus } from '../types/Post';

// Create Community Post Handler
export const createCommunityPostHandler = functions.https.onCall(async (data, context) => {
    try {
        const user = await getAuthenticatedUser(context);
        const { title, imageUrls, type = CommunityPostType.Post, scheduledAt, visibility } = data;

        if (!title) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        const newPost = {
            title,
            createdBy: user.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
            deleted: false,
            visibility: scheduledAt ? PostVisibilityStatus.Scheduled : visibility || PostVisibilityStatus.Public,
            imageUrls,
            type,
            votes: [],
            comments: [],
            createdUser: {
                uid: user.uid,
                displayName: user.displayName,
                profileImageUrl: user.profileImageUrl,
            },
            ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
        };

        const createdPost = await createCommunityPost(newPost);
        return { message: 'Community post created successfully', data: createdPost };
    } catch (error) {
        return handleError(error);
    }
});

// Update Community Post Handler
export const updateCommunityPostHandler = functions.https.onCall(async (data, context) => {
    try {
        const user = await getAuthenticatedUser(context);
        const { id, title, imageUrls, type = CommunityPostType.Post, scheduledAt, visibility } = data;

        if (!id || !title) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        const existingPost = await getCommunityPost(id);
        if (!existingPost) {
            throw new functions.https.HttpsError('not-found', 'Community post not found.');
        }

        if (existingPost.createdBy !== user.uid) {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to update this community post.');
        }

        if (existingPost.visibility === 'public') {
            throw new functions.https.HttpsError('permission-denied', 'Cannot update a published community post. Only delete.');
        }

        const updatedData = {
            title,
            type,
            imageUrls,
            visibility: scheduledAt ? PostVisibilityStatus.Scheduled : visibility || existingPost.visibility,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : existingPost.scheduledAt,
            updatedAt: admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
        };

        const updatedPost = await updateCommunityPost(id, updatedData);
        return { message: 'Community post updated successfully', data: updatedPost.data() as CommunityPost };
    } catch (error) {
        return handleError(error);
    }
});

// Delete Community Post Handler
export const deleteCommunityPostHandler = functions.https.onCall(async (data, context) => {
    try {
        const user = await getAuthenticatedUser(context);
        const { id } = data;

        if (!id) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing community post ID.');
        }

        const existingPost = await getCommunityPost(id);
        if (!existingPost) {
            throw new functions.https.HttpsError('not-found', 'Community post not found.');
        }

        if (existingPost.createdBy !== user.uid) {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to delete this community post.');
        }

        await deleteCommunityPost(id);
        return { message: 'Community post deleted successfully' };
    } catch (error) {
        return handleError(error);
    }
});

// Get Paginated Community Posts Handler
export const getPaginatedCommunityPostsHandler = functions.https.onCall(async (data, context) => {
    try {
        await getAuthenticatedUser(context);
        const { type = CommunityPostType.Post, pageSize = 10, lastVisible, visibility = PostVisibilityStatus.Public } = data;

        const response: GetPaginatedCommunityPostsResponse = await getPaginatedCommunityPosts(
            type,
            pageSize,
            lastVisible,
            visibility
        );
        return response;
    } catch (error) {
        return handleError(error);
    }
});

// Publish Scheduled Community Posts Handler (Scheduled Pub/Sub Function)
export const publishScheduledCommunityPostsHandler = functions.pubsub.schedule('every 5 minutes').onRun(async () => {
    try {
        await publishScheduledCommunityPosts();
        console.log('Scheduled community posts published successfully');
        return null;
    } catch (error) {
        console.error('Error publishing scheduled community posts:', error);
        return null;
    }
});

// Get Paginated User-Specific Community Posts Handler
export const getPaginatedUserSpecificCommunityPostsHandler = functions.https.onCall(async (data, context) => {
    try {
        const user = await getAuthenticatedUser(context);
        const { type = 'post', pageSize = 10, lastVisible, visibility = PostVisibilityStatus.Public } = data;

        const response: GetPaginatedCommunityPostsResponse = await getPaginatedUserSpecificCommunityPosts(
            user.uid,
            type,
            pageSize,
            lastVisible,
            visibility
        );
        return response;
    } catch (error) {
        return handleError(error);
    }
});