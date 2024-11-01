/* eslint-disable */
import * as functions from 'firebase-functions';

export const handleError = (error: any) => {
    console.error('Error:', error);
    if (error instanceof functions.https.HttpsError) {
        throw error;
    } else {
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred.');
    }
};
