/* eslint-disable */
import admin from "../admin/firebaseAdmin";

export const now = admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp;

export const nowTimestamp = admin.firestore.Timestamp.now();
