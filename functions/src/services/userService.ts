/* eslint-disable */
import admin from '../admin/firebaseAdmin';
import { UserDocument } from '../types/User';
import { generateOtp } from '../utils/authUtils';
import { now } from '../utils/commonUtils';
import { sendOtpEmail } from './emailService';

const USERS_COLLECTION = 'users';
const OTP_EXPIRATION_MINUTES = 10;

export const registerNewUser = async (user: UserDocument): Promise<void> => {
    const userRef = admin.firestore().collection(USERS_COLLECTION).doc(user.uid);
    await userRef.set(user);
    console.log(`User document created for user ${user.uid}`);
};

export const createUserDocument = async (user: UserDocument, otp: string): Promise<void> => {
    // Create user document in Firestore
    await registerNewUser(user);

    // Store OTP with timestamp in Firestore
    await admin.firestore().collection(USERS_COLLECTION).doc(user.uid).set(
        { otp, otpCreatedAt: now },
        { merge: true }
    );

    // Send OTP email to the user
    if (user.email) {
        await sendOtpEmail(user.email, otp);
    }

    console.log(`User document created and OTP sent for user ${user.uid}`);
};

// Function to verify OTP with expiration check
export const verifyOtp = async (uid: string, inputOtp: string): Promise<boolean> => {
    const userRef = admin.firestore().collection(USERS_COLLECTION).doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        throw new Error('User not found');
    }

    const userData = userDoc.data();
    const storedOtp = userData?.otp;
    const otpCreatedAt = userData?.otpCreatedAt?.toDate();

    // Check if the OTP is valid and within the expiration period
    const isOtpExpired = otpCreatedAt && (Date.now() - otpCreatedAt.getTime()) > OTP_EXPIRATION_MINUTES * 60 * 1000;

    if (storedOtp === inputOtp && !isOtpExpired) {
        console.log('OTP verified successfully');
        return true;
    } else {
        console.log('OTP is invalid or has expired');
        return false;
    }
};

// Resend OTP function
export const resendOtp = async (uid: string, email: string): Promise<{ otp: string}> => {
    const otp = generateOtp();

    // Update the OTP and reset otpCreatedAt
    await admin.firestore().collection(USERS_COLLECTION).doc(uid).set(
        {
            otp,
            otpCreatedAt: now,
        },
        { merge: true }
    );

    // Send the OTP email
    await sendOtpEmail(email, otp);
    console.log(`OTP resent to ${email}`);
    return {
        otp
    }
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

    snapshot.forEach(doc => {
        batch.update(doc.ref, { deleted: true, deletedAt: now });
    });

    await batch.commit();
}