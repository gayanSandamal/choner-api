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

export const validateAddKeyInput = (data: any) => {
    const { collectionName, key, value } = data;

    if (!collectionName || !key || typeof value === 'undefined') {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters: collectionName, key, value.');
    }

    return { collectionName, key, value };
};