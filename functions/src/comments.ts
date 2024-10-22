/* eslint-disable */
import * as functions from "firebase-functions";
import admin from "./firebaseAdmin";

export const createComment = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user ID from the authenticated context
        const uid = context.auth.uid;

        // Get the user document from Firestore
        const userDoc = await admin.firestore().collection('users').doc(uid).get();

        // Check if the user document exists
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found.');
        }
        const userData = userDoc.data();
        // Sanitize the user data to avoid exposing private information
        const createdBy = {
            uid,
            displayName: userData?.displayName,
            profileImageUrl: userData?.profileImageUrl
        };

        // Extract data from the request
        const { type = 'community', postId, comment } = data;

        // Validate required fields
        if (!postId || !comment || !createdBy) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        // Create a new community comments document
        const communityCommentRef = admin.firestore().collection(`${type}Comments`).doc();

        const newCommunityComment = {
            postId,
            id: communityCommentRef.id,
            comment,
            createdBy,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        // Set the new interest post document in Firestore
        await communityCommentRef.set(newCommunityComment);

        console.log(`Comment created with ID: ${communityCommentRef.id}`);

        // Return the created interest post data, along with safe user data
        return {
            data: newCommunityComment,
            message: `${type} comment has been created successfully`
        };
        
    } catch (error) {
        console.error('Error creating interest post:', error);
        // Improve the returned error message for better debugging
        throw error;
    }
});

export const updateComment = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user ID from the authenticated context
        const uid = context.auth.uid;

        // Extract data from the request
        const { type = 'community', commentId, comment } = data;

        // Validate required fields
        if (!commentId || !comment) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        // Get the community comment document
        const communityCommentRef = admin.firestore().collection(`${type}Comments`).doc(commentId);
        const communityCommentGet = await communityCommentRef.get();
        const communityCommentData = communityCommentGet.data();

        if (!communityCommentData) {
            throw new functions.https.HttpsError('not-found', 'Comment not found.');
        }

        if (communityCommentData.createdBy.uid !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to update this comment.');
        }

        const updatedComment = {
            comment,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Update the comment document in Firestore
        await communityCommentRef.update(updatedComment);

        console.log(`Comment updated with ID: ${commentId}`);

        // Return the updated comment data
        return {
            data: { ...communityCommentData, ...updatedComment },
            message: `${type} comment has been updated successfully`
        };
    } catch (error) {
        console.error('Error updating comment:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while updating the comment.');
    }
});

export const deleteComment = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user ID from the authenticated context
        const uid = context.auth.uid;

        // Get the user document from Firestore
        const userDoc = await admin.firestore().collection('users').doc(uid).get();

        // Check if the user document exists
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found.');
        }
        const userData = userDoc.data();
        // Sanitize the user data to avoid exposing private information
        const deletedBy = {
            uid,
            displayName: userData?.displayName,
            profileImageUrl: userData?.profileImageUrl
        };

        // Extract data from the request
        const { type = 'community', commentId } = data;

        // Validate required fields
        if (!commentId || !deletedBy) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        // Create a new community comments document
        const communityCommentRef = admin.firestore().collection(`${type}Comments`).doc(commentId);

        const communityComment = await communityCommentRef.get();
        if (communityComment.data()?.createdBy.uid !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to delete this comment.');
        }

        // Delete the comment document from Firestore
        await communityCommentRef.delete();

        console.log(`Comment deleted with ID: ${commentId}`);

        // Return the created interest post data, along with safe user data
        return {
            message: `${type} comment has been deleted successfully`
        };
        
    } catch (error) {
        console.error('Error deleting interest post:', error);
        // Improve the returned error message for better debugging
        throw error;
    }
});

interface Comment {
  id: string;
  postId: string;
  comment: string;
  createdBy: {
    uid: string;
    displayName: string;
    profileImageUrl: string;
  };
  createdAt: FirebaseFirestore.Timestamp;
}

export const getComments = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Extract data from the request
        const { type = 'community', postId, pageSize = 10, lastVisible } = data;

        // Validate required fields
        if (!postId) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        // Create a reference to the comments collection
        const commentsRef = admin.firestore().collection(`${type}Comments`);

        // Start building the query
        let query = commentsRef
            .where('postId', '==', postId)
            .orderBy('createdAt', 'desc')
            .limit(pageSize);

        // If lastVisible is provided, use it for pagination
        if (lastVisible) {
            const lastVisibleDoc = await commentsRef.doc(lastVisible).get();
            if (lastVisibleDoc.exists) {
                query = query.startAfter(lastVisibleDoc);
            } else {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid lastVisible document ID.');
            }
        }

        // Execute the query
        const snapshot = await query.get();

        // Process the results
        const comments: Comment[] = [];
        snapshot.forEach((doc) => {
            comments.push({
                id: doc.id,
                ...(doc.data() as Omit<Comment, 'id'>)
            });
        });

        // Get the last visible document for next pagination
        const lastVisibleDocument = snapshot.docs[snapshot.docs.length - 1];

        return {
            comments,
            lastVisible: lastVisibleDocument ? lastVisibleDocument.id : null,
            hasMore: comments.length === pageSize
        };

    } catch (error) {
        console.error('Error fetching comments:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while fetching comments.');
    }
});