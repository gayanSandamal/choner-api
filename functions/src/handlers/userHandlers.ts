/* eslint-disable */
import * as functions from 'firebase-functions';
import {
    createUserDocument,
    getUserDocument,
    updateUserDocument,
    deleteUserDocument,
    deleteUserFromAuth,
    deleteUserDataFromCollection,
    softDeleteUserDataFromCollection,
} from '../services/userService';
import { UserDocument, UpdateUserResponse } from '../types/User';
import { handleError } from '../utils/errorHandler';
import admin from '../admin/firebaseAdmin';

// Create User Document Handler (Triggered on Auth User Creation)
export const createUserDocumentHandler = functions.auth.user().onCreate(async (user) => {
    try {
        const newUser: UserDocument = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            emailVerified: user.emailVerified,
        };
        await createUserDocument(newUser);
    } catch (error) {
        console.error(`Error creating user document: ${error}`);
    }
});

// Get User Document Handler
export const getUserHandler = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        const { uid } = data;
        const userDoc = await getUserDocument(uid);
        if (!userDoc) {
            throw new functions.https.HttpsError('not-found', 'User not found.');
        }

        return userDoc;
    } catch (error) {
        console.error('Error getting user data:', error);
        return handleError(error);
    }
});

// Update User Document Handler
export const setUserHandler = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        const { uid, ...updateData } = data;
        await updateUserDocument(uid, updateData);

        const response: UpdateUserResponse = { message: 'User data updated successfully' };
        return response;
    } catch (error) {
        console.error('Error updating user data:', error);
        return handleError(error);
    }
});

// Delete User Document Handler
// This is a hard delete, meaning all user data is deleted from Firestore and Firebase Authentication
export const deleteUserHandler = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        const { uid, isPermanent = false } = data;


        // Soft delete user-related documents from various collections
        if (!isPermanent) {
            await softDeleteUserDataFromCollection('community', uid);
            await softDeleteUserDataFromCollection('interests', uid);
            await softDeleteUserDataFromCollection('comments', uid);
            await softDeleteUserDataFromCollection('replies', uid);
        } else {
            // Hard delete user-related documents from various collections
            await deleteUserDataFromCollection('community', uid);
            await deleteUserDataFromCollection('interests', uid);
            await deleteUserDataFromCollection('comments', uid);
            await deleteUserDataFromCollection('replies', uid);
        }

        // Delete user document from the Firestore users collection
        await deleteUserDocument(uid);

        // Delete user from Firebase Authentication
        await deleteUserFromAuth(uid);

        const response: UpdateUserResponse = { message: 'User and associated data deleted successfully' };
        return response;
    } catch (error) {
        console.error('Error deleting user and associated data:', error);
        return handleError(error);
    }
});
