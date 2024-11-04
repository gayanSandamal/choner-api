
import admin from "../admin/firebaseAdmin";

export const batchAddKeyToDocuments = async (
  collectionName: string, key: string, value: any
): Promise<string> => {
  const collectionRef = admin.firestore().collection(collectionName);
  const snapshot = await collectionRef.get();

  const batch = admin.firestore().batch();
  snapshot.forEach((doc) => {
    const docData = doc.data();

    // Check if the key doesn't exist
    if (!(key in docData)) {
      const docRef = collectionRef.doc(doc.id);
      batch.update(docRef, {[key]: value});
    }
  });

  // Commit the batch update
  await batch.commit();
  return `Successfully added ${key}: ${value} to documents without this key in ${collectionName}.`;
};
