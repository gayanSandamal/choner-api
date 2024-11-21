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
import {UserDocument, UpdateUserResponse} from '../types/User';
import {handleError} from '../utils/errorHandler';
import {getCreatedUserDTO} from '../utils/authUtils';
import {UserInfo} from 'firebase-admin/auth';

// Create User Document Handler (Triggered on Auth User Creation)
export const createUserDocumentHandler = functions.auth.user().onCreate(async (user) => {
  try {
    const newUser: UserDocument = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
    };

    // Register new user and send OTP
    await createUserDocument(newUser);

    return newUser;
  } catch (error) {
    console.error(`Error creating user document or sending OTP: ${error}`);
    return handleError(error);
  }
});

// Get User Document Handler
export const getUserHandler = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
    }

    const {uid} = data;
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

    const {uid, ...updateData} = data;
    const user = getCreatedUserDTO(context?.auth as unknown as UserInfo);
    const userDoc = {
      ...user,
      ...updateData,
    };

    await updateUserDocument(uid, userDoc);

    const response: UpdateUserResponse = {message: 'User data updated successfully'};
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

    const {uid, isPermanent = true} = data;


    // Soft delete user-related documents from various collections
    if (!isPermanent) {
      await softDeleteUserDataFromCollection('community', uid);
      await softDeleteUserDataFromCollection('interests', uid);
      await softDeleteUserDataFromCollection('challenges', uid);
      await softDeleteUserDataFromCollection('replies', uid);
      await softDeleteUserDataFromCollection('communityPostComments', uid);
      await softDeleteUserDataFromCollection('communityPostReplies', uid);
      await softDeleteUserDataFromCollection('communityQuestionComments', uid);
      await softDeleteUserDataFromCollection('communityQuestionReplies', uid);
      await softDeleteUserDataFromCollection('interestsPostComments', uid);
      await softDeleteUserDataFromCollection('interestsPostReplies', uid);
      await softDeleteUserDataFromCollection('submissions', uid);
    } else {
      // Hard delete user-related documents from various collections
      await deleteUserDataFromCollection('community', uid);
      await deleteUserDataFromCollection('interests', uid);
      await deleteUserDataFromCollection('challenges', uid);
      await deleteUserDataFromCollection('replies', uid);
      await deleteUserDataFromCollection('communityPostComments', uid);
      await deleteUserDataFromCollection('communityPostReplies', uid);
      await deleteUserDataFromCollection('communityQuestionComments', uid);
      await deleteUserDataFromCollection('communityQuestionReplies', uid);
      await deleteUserDataFromCollection('interestsPostComments', uid);
      await deleteUserDataFromCollection('interestsPostReplies', uid);
      await deleteUserDataFromCollection('submissions', uid);
    }

    // Delete user document from the Firestore users collection
    await deleteUserDocument(uid);

    // Delete user from Firebase Authentication
    await deleteUserFromAuth(uid);

    const response: UpdateUserResponse = {message: 'User and associated data deleted successfully'};
    return response;
  } catch (error) {
    console.error('Error deleting user and associated data:', error);
    return handleError(error);
  }
});
