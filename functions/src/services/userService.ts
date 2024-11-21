import {UserInfo} from 'firebase-admin/auth';
import admin from '../admin/firebaseAdmin';
import {UserDocument} from '../types/User';
import {getCreatedUserDTO} from '../utils/authUtils';
import {now} from '../utils/commonUtils';
import {bulkUpdateFormSubmissions} from './formService';

const USERS_COLLECTION = 'users';

export const registerNewUser = async (user: UserDocument): Promise<void> => {
  const userRef = admin.firestore().collection(USERS_COLLECTION).doc(user.uid);
  await userRef.set(user);
  console.log(`User document created for user ${user.uid}`);
};

export const createUserDocument = async (user: UserDocument): Promise<void> => {
  // Create user document in Firestore
  await registerNewUser(user);

  const userId = JSON.parse(JSON.stringify(user.uid));
  const userData = user as unknown as Record<string, unknown>;

  // Delete uid, email, displayName, photoURL, providerId, phoneNumber from user object
  delete userData.uid;
  delete userData.email;
  delete userData.displayName;
  delete userData.photoURL;
  delete userData.providerId;
  delete userData.phoneNumber;

  await admin.auth().setCustomUserClaims(userId, user);

  console.log(`User document created and OTP sent for user ${user.uid}`);
};

export const getUserDocument = async (uid: string): Promise<UserDocument | null> => {
  const userDoc = await admin.firestore().collection(USERS_COLLECTION).doc(uid).get();
  return userDoc.exists ? (userDoc.data() as UserDocument) : null;
};

export const updateUserDocument = async (uid: string, userData: Partial<UserDocument>): Promise<void> => {
  const userRef = admin.firestore().collection(USERS_COLLECTION).doc(uid);
  await userRef.update(userData);

  // Directly update the Firebase Auth user profile
  await admin.auth().updateUser(uid, {
    displayName: userData.displayName || '',
    ...(userData.profileImageUrl && {photoURL: userData.profileImageUrl}),
  });

  console.log('userData', JSON.stringify(userData));

  // Update user data in form submissions if displayName or profileImageUrl is missing in submissions
  const updatedFormCount = await bulkUpdateFormSubmissions(uid, getCreatedUserDTO(userData as UserInfo));

  console.log(`User data updated for user ${uid} and ${updatedFormCount} form submissions updated`);
};


export const deleteUserDocument = async (uid: string): Promise<void> => {
  const userRef = admin.firestore().collection(USERS_COLLECTION).doc(uid);
  await userRef.delete();
  console.log(`User document deleted for user ${uid}`);
};

export const deleteUserFromAuth = async (uid: string): Promise<void> => {
  await admin.auth().deleteUser(uid);
  console.log(`User deleted from Firebase Authentication for user ${uid}`);
};

// Helper function to delete all documents in a collection where `createdBy` matches the `uid`
export const deleteUserDataFromCollection = async (collectionName: string, uid: string): Promise<void> => {
  const collectionRef = admin.firestore().collection(collectionName);
  const snapshot = await collectionRef.where('createdBy.uid', '==', uid).get();

  const batch = admin.firestore().batch();
  snapshot.forEach((doc) => batch.delete(doc.ref));

  await batch.commit();
};

// Helper function to perform a soft delete by setting `deleted: true` and `deletedAt: Timestamp`
export const softDeleteUserDataFromCollection = async (collectionName: string, uid: string): Promise<void> => {
  const collectionRef = admin.firestore().collection(collectionName);
  const snapshot = await collectionRef.where('createdBy.uid', '==', uid).get();

  const batch = admin.firestore().batch();

  snapshot.forEach((doc) => {
    batch.update(doc.ref, {deleted: true, deletedAt: now});
  });

  await batch.commit();
};
