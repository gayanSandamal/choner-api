import * as functions from "firebase-functions";
import {batchAddKeyToDocuments} from "../services/firestoreService";
import {validateAddKeyInput} from "../utils/errorHandler";

export const addKeyToDocumentsHandler = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    try {
      if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Unauthenticated user.");
      }

      // Validate input data
      const {collectionName, key, value} = validateAddKeyInput(data);

      const message = await batchAddKeyToDocuments(collectionName, key, value);
      return {message};
    } catch (error) {
      console.error("Error updating documents:", error);
      throw new functions.https.HttpsError("internal", "Error updating documents.");
    }
  });
