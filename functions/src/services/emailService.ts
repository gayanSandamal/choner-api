/* eslint-disable */
import admin from '../admin/firebaseAdmin';
import { Email } from '../types/Email';

const MAIL_COLLECTION = 'mail';

export const sendEmail = async (emailData: Email): Promise<void> => {
    await admin.firestore().collection(MAIL_COLLECTION).add({
        to: emailData.to,
        message: {
            subject: emailData.subject,
            text: emailData.text,
            html: emailData.html,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Email sent to ${emailData.to}`);
};

export const sendOtpEmail = async (to: string, otp: string): Promise<void> => {
    const emailData: Email = {
        to,
        subject: 'Your OTP Code for Account Verification',
        text: `Your OTP code is ${otp}. Please use this code to verify your account.`,
        html: `<p>Your OTP code is <strong>${otp}</strong>. Please use this code to verify your account.</p>`,
    };

    await sendEmail(emailData);
};