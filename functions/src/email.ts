/* eslint-disable */
import * as functions from "firebase-functions";
import admin from "./admin/firebaseAdmin";

export const sendEmail = functions.https.onCall(async (data, context) => {
    try {
        // Get the email data from the request
        const { to, subject, text } = data;

        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Send the email
        await admin.firestore().collection('mail').add({
            to,
            message: {
              subject,
              text,
              html: text,
            },
        });

        console.log(`Email sent to ${to}`);

    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
});