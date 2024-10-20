/* eslint-disable */
import * as functions from "firebase-functions";
import admin from "./firebaseAdmin";

export const createCommunityComment = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user ID from the authenticated context
        const uid = context.auth.uid;

        // Extract data from the request
        const { comment, createdBy } = data;

        // Validate required fields
        if (!comment || !createdBy) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        // Create a new community comments document
        const communityCommentsRef = admin.firestore().collection('communityComments').doc();

        const newCommunityComment = {
            id: communityCommentsRef.id,
            comment,
            createdBy,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        // Set the new interest post document in Firestore
        await communityCommentsRef.set(newCommunityComment);
        
    } catch (error) {
        console.error('Error creating interest post:', error);
        // Improve the returned error message for better debugging
        throw error;
    }
});