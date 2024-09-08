/* eslint-disable */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp();

exports.createUserDocument = functions.auth.user().onCreate(async (user: any) => {
    try {
        // Get the user ID from the user data
        const uid = user.uid;
        const userRef = admin.firestore().collection("users").doc(uid);

        await userRef.set({
            email: user.email,
            displayName: user.displayName,
            emailVerified: user.emailVerified,
            uid,
        });

        console.log(`User document created for user ${user.uid}`);
    } catch (error) {
        console.error(`Error creating user document: ${error}`);
    }
});

exports.getUser = functions.https.onCall(async (data, context) => {
    try {
        // Get the user ID from the request data
        const uid = data.uid;

        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user document from Firestore
        const userDoc = await admin.firestore().collection('users').doc(uid).get();

        // Check if the user document exists
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found.');
        }

        // Return the user data
        return userDoc.data();

    } catch (error) {
        console.error('Error getting user data:', error);
        throw error;
    }
});

exports.setUser = functions.https.onCall(async (data, context) => {
    try {
        // Get the user ID from the request data
        const uid = data.uid;

        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user document reference
        const userRef = admin.firestore().collection('users').doc(uid);

        // Update the user document with the new data
        await userRef.update({
            uid,
            ...data
        });

        console.log(`User data updated for user ${uid}`);

        // Return a success message
        return { message: 'User data updated successfully' };

    } catch (error) {
        console.error('Error updating user data:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while updating user data.');
    }
});

exports.uploadUserImage = functions.https.onCall(async (data, context) => {
    try {
        // Get the user ID from the request data
        const uid = data.uid;

        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user document reference
        const userRef = admin.firestore().collection('users').doc(uid);

        // Get the user document data
        const userDoc = await userRef.get();

        // Check if the user document exists
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found.');
        }

        // Get the image URL from the request data
        const imageUrl = data.imageUrl;

        // Update the user document with the new image URL
        await userRef.update({
            imageUrl
        });

        console.log(`User image updated for user ${uid}`);

        // Return a success message
        return { message: 'User image updated successfully' };

    } catch (error) {
        console.error('Error updating user image:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while updating user image.');
    }
});
