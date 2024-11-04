import * as functions from "firebase-functions";
import {batchAddKeyToDocuments} from "../services/firestoreService";
import {validateAddKeyInput} from "../utils/errorHandler";
import {getAuthenticatedUser} from "../utils/authUtils";

export const addKeyToDocumentsHandler = functions.https.onCall(
  async (data: unknown, context: functions.https.CallableContext) => {
    try {
      await getAuthenticatedUser(context);

      // Validate input data
      const {collectionName, key, value} = validateAddKeyInput(data);

      const message = await batchAddKeyToDocuments(collectionName, key, value);
      return {message};
    } catch (error) {
      console.error("Error updating documents:", error);
      throw new functions.https.HttpsError("internal", "Error updating documents.");
    }
  });
