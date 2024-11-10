/* eslint-disable */
import admin from '../admin/firebaseAdmin';
import { Interest, GetPaginatedInterestsResponse } from '../types/Interest';
import { PostVisibilities, PostVisibilityStatus } from '../types/Post';

const INTEREST_COLLECTION = "interests";

export const createInterest = async (interestData: Omit<Interest, "id">): Promise<Interest> => {
  const interestRef = admin.firestore().collection(INTEREST_COLLECTION).doc();
  const newInterest: Interest = {...interestData, id: interestRef.id};
  await interestRef.set(newInterest);
  return newInterest;
};

export const updateInterest = async (
  interestId: string,
  updatedData: Partial<Interest>
): Promise<FirebaseFirestore.DocumentSnapshot<Interest>> => {
  const interestRef = admin.firestore().collection(INTEREST_COLLECTION).doc(interestId);
  await interestRef.update(updatedData);
  return interestRef.get() as unknown as FirebaseFirestore.DocumentSnapshot<Interest>;
};

export const deleteInterest = async (interestId: string): Promise<void> => {
  const interestRef = admin.firestore().collection(INTEREST_COLLECTION).doc(interestId);
  await interestRef.delete();
};

export const getInterest = async (interestId: string): Promise<Interest | null> => {
  const interestDoc = await admin.firestore().collection(INTEREST_COLLECTION).doc(interestId).get();
  return interestDoc.exists ? (interestDoc.data() as Interest) : null;
};

export const getPaginatedInterests = async (
  pageSize: number,
  lastVisible: string | undefined,
  visibility: PostVisibilities = PostVisibilityStatus.Public
): Promise<GetPaginatedInterestsResponse> => {
  let query = admin.firestore()
    .collection(INTEREST_COLLECTION)
    .where("visibility", "==", visibility)
    .where("deleted", "==", false)
    .orderBy("createdAt", "desc")
    .limit(pageSize);

  if (lastVisible) {
    const lastVisibleDoc = await admin.firestore().collection(INTEREST_COLLECTION).doc(lastVisible).get();
    if (lastVisibleDoc.exists) {
      query = query.startAfter(lastVisibleDoc);
    } else {
      throw new Error("Invalid lastVisible document ID.");
    }
  }

  const snapshot = await query.get();
  const interests: Interest[] = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()} as Interest));

  return {
    interests,
    lastVisible: snapshot.docs[snapshot.docs.length - 1]?.id || null,
    hasMore: interests.length === pageSize,
  };
};

export const getPaginatedUserSpecificInterests = async (
  uid: string,
  pageSize: number,
  lastVisible: string | undefined,
  visibility: PostVisibilities = PostVisibilityStatus.Public
): Promise<GetPaginatedInterestsResponse> => {
  let query = admin.firestore()
    .collection(INTEREST_COLLECTION)
    .where("visibility", "==", visibility)
    .where("createdBy.uid", "==", uid)
    .where("deleted", "==", false)
    .orderBy("createdAt", "desc")
    .limit(pageSize);

  if (lastVisible) {
    const lastVisibleDoc = await admin.firestore().collection(INTEREST_COLLECTION).doc(lastVisible).get();
    if (lastVisibleDoc.exists) {
      query = query.startAfter(lastVisibleDoc);
    } else {
      throw new Error("Invalid lastVisible document ID.");
    }
  }

  const snapshot = await query.get();
  const interests: Interest[] = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()} as Interest));

  return {
    interests,
    lastVisible: snapshot.docs[snapshot.docs.length - 1]?.id || null,
    hasMore: interests.length === pageSize,
  };
};

// Publish scheduled interests function for a scheduled job
export const publishScheduledInterests = async (): Promise<number> => {
  const interestsRef = admin.firestore().collection(INTEREST_COLLECTION);

    const scheduledInterests = await interestsRef
        .where('visibility', '==', PostVisibilityStatus.Scheduled)
        .where('scheduledAt', '<=', admin.firestore.Timestamp.now())
        .where('deleted', '==', false)
        .get();

  const batch = admin.firestore().batch();

  scheduledInterests.forEach((doc) => {
    batch.update(doc.ref, {visibility: "public"});
  });

  await batch.commit();
  return scheduledInterests.size || 0;
};
