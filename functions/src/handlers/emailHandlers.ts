import * as functions from "firebase-functions";
import {sendEmail} from "../services/emailService";
import {handleError} from "../utils/errorHandler";
import {Email} from "../types/Email";
import {getAuthenticatedUser} from "../utils/authUtils";

// Send Email Handler
export const sendEmailHandler = functions.https.onCall(async (data, context) => {
  try {
    // Check if the user is authenticated
    await getAuthenticatedUser(context);

    // Get email data from the request
    const {to, subject, text} = data;

    // Validate email fields
    if (!to || !subject || !text) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required fields: to, subject, or text.");
    }

    // Construct email data
    const emailData: Email = {
      to,
      subject,
      text,
      html: text,
    };

    // Send the email
    await sendEmail(emailData);
    return {message: `Email sent to ${to}`};
  } catch (error) {
    console.error("Error sending email:", error);
    return handleError(error);
  }
});