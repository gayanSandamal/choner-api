/* eslint-disable */
import admin from '../admin/firebaseAdmin';
import { UserDocument } from '../types/User';

const USERS_COLLECTION = 'users';

export const createUserDocument = async (user: UserDocument): Promise<void> => {
    const userRef = admin.firestore().collection(USERS_COLLECTION).doc(user.uid);
    await userRef.set(user);
    console.log(`User document created for user ${user.uid}`);
};

export const getUserDocument = async (uid: string): Promise<UserDocument | null> => {
    const userDoc = await admin.firestore().collection(USERS_COLLECTION).doc(uid).get();
    return userDoc.exists ? (userDoc.data() as UserDocument) : null;
};

export const updateUserDocument = async (uid: string, userData: Partial<UserDocument>): Promise<void> => {
    const userRef = admin.firestore().collection(USERS_COLLECTION).doc(uid);
    await userRef.update(userData);
    console.log(`User data updated for user ${uid}`);
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
export const deleteUserDataFromCollection = async(collectionName: string, uid: string): Promise<void> => {
    const collectionRef = admin.firestore().collection(collectionName);
    const snapshot = await collectionRef.where('createdBy', '==', uid).get();

    const batch = admin.firestore().batch();
    snapshot.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
}

// Helper function to perform a soft delete by setting `deleted: true` and `deletedAt: Timestamp`
export const softDeleteUserDataFromCollection = async(collectionName: string, uid: string): Promise<void> => {
    const collectionRef = admin.firestore().collection(collectionName);
    const snapshot = await collectionRef.where('createdBy', '==', uid).get();

    const batch = admin.firestore().batch();
    const now = admin.firestore.FieldValue.serverTimestamp();

    snapshot.forEach(doc => {
        batch.update(doc.ref, { deleted: true, deletedAt: now });
    });

    await batch.commit();
}