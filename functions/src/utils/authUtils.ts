/* eslint-disable */
import * as functions from 'firebase-functions';
import admin from '../admin/firebaseAdmin';
import { UserInfo } from '../types/User';

export const getAuthenticatedUser = async (context: functions.https.CallableContext) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
    }

    const uid = context.auth.uid;
    const userDoc = await admin.firestore().collection('users').doc(uid).get();

    if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found.');
    }

    return { uid, ...userDoc.data() } as UserInfo;
};

export const generateOtp = (): string => {
    // Generates a 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
};
