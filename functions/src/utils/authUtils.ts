import * as functions from 'firebase-functions';
import admin from '../admin/firebaseAdmin';
import {UserInfo} from '../types/User';
import {handleError} from './errorHandler';

export const isAuthorized = (context: functions.https.CallableContext) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
    }
    return true;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

export const getAuthenticatedUser = async (context: functions.https.CallableContext) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
    }
    const uid = context.auth.uid;
    const userDoc = await admin.firestore().collection('users').doc(uid).get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found.');
    }

    return {uid, ...userDoc.data()} as UserInfo;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

export const getCreatedUserDTO = (user: UserInfo): UserInfo => {
  return {
    uid: user.uid,
    displayName: user.displayName,
    profileImageUrl: user.profileImageUrl || '',
  };
};
