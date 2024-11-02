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
    resendOtp
} from '../services/userService';
import { UserDocument, UpdateUserResponse } from '../types/User';
import { handleError } from '../utils/errorHandler';
import { generateOtp } from '../utils/authUtils';

// Create User Document Handler (Triggered on Auth User Creation)
export const createUserDocumentHandler = functions.auth.user().onCreate(async (user) => {
    try {
        // Generate OTP
        const otp = generateOtp();

        const newUser: UserDocument = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            emailVerified: user.emailVerified,
        };
        
        // Register new user and send OTP
        await createUserDocument(newUser, otp);

        return {
            ...newUser,
            otp
        }
    } catch (error) {
        console.error(`Error creating user document or sending OTP: ${error}`);
        return handleError(error);
    }
});

// Resend OTP Handler
export const resendOtpHandler = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Extract UID and email from request data
        const { uid, email } = data;

        if (!uid || !email) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: uid or email.');
        }

        // Call the resendOtp function to generate and send a new OTP
        await resendOtp(uid, email);

        return { message: 'OTP resent successfully' };
    } catch (error) {
        console.error('Error resending OTP:', error);
        return handleError(error);
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
