import admin from '../admin/firebaseAdmin';

export const now = admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp;

export const splitCamelCase = (str: string) => {
  return str.split(/(?=[A-Z])/).map((word) => word.toLowerCase());
};
