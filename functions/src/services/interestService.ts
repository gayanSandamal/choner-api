/* eslint-disable */
import admin from '../admin/firebaseAdmin';
import { Interest, GetPaginatedInterestsResponse, EnrolmentStatus, EnrolmentStatuses } from '../types/Interest';
import { PostVisibilities, PostVisibilityStatus } from '../types/Post';
import { UserInfo } from '../types/User';

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
  const interests = await Promise.all(snapshot.docs.map(async (doc) => {
    const data = doc.data() as Interest;
    let enrolmentStatus: EnrolmentStatuses = EnrolmentStatus.NOT_ENROLLED; // Default status

    // Check if the user is a participant and get their status
    if (data.enrolments) {
      const enrollment = data.enrolments.find((p) => p.uid === uid);
      if (enrollment) {
        enrolmentStatus = EnrolmentStatus.ENROLLED;
      } else {
        enrolmentStatus = EnrolmentStatus.NOT_ENROLLED;
      }
    }

    const response = {
      ...data,
      enrolmentStatus, // Attach the enrolmentStatus to the interest data
    };

    delete response.enrolments // Remove participants from the response

    return data;
  }));

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

// Join an interest by adding the current user to the enrollments list
const joinInterest = async (interestId: string, enthusiast: UserInfo): Promise<any> => {
  const interestRef = admin.firestore().collection(INTEREST_COLLECTION).doc(interestId);

  const enrolment = {
    ...enthusiast,
    enthusiastStatus: EnrolmentStatus.ENROLLED,
  };

  await interestRef.update({
    enrolments: admin.firestore.FieldValue.arrayUnion(enrolment),
  });
};

// Leave an interest by removing the current user from the enrollments list
const leaveInterest = async (interestId: string, enthusiast: UserInfo): Promise<void> => {
  const interestRef = admin.firestore().collection(INTEREST_COLLECTION).doc(interestId);
  await interestRef.update({
    enrolments: admin.firestore.FieldValue.arrayRemove(enthusiast),
  });
};

// Get single interest by interestId
export const getChallengeById = async (interestId: string): Promise<Interest | null> => {
  const interestDoc = await admin.firestore().collection(INTEREST_COLLECTION).doc(interestId).get();
  return interestDoc.exists ? (interestDoc.data() as Interest) : null;
};

// Join or leave an interest based on the current enrollment status
// If the current user is already enrolled, they will be removed from the enrolments list or vice versa
export const toggleInterestEnrolment = async (
  interest: Interest,
  enthusiast: UserInfo,
  uid: string
): Promise<Interest> => {
  const interestId = interest?.id || '';
  const enrolments = interest?.enrolments || [];

  const getSanitizedInterest = async (): Promise<Interest> => {
    const interest = await getChallengeById(interestId);
    // Check if the user is a participant and get their status
    const enrollments = interest?.enrolments?.find((p) => p.uid === uid) as any;
    if (interest) {
      interest.enrolmentStatus = enrollments;
    }
    return interest as Interest;
  };

  if (enrolments.some((p) => p.uid === enthusiast.uid)) {
    await leaveInterest(interestId, enthusiast);
    const interest = await getSanitizedInterest();
    if (!interest) {
      throw new Error('Interest not found');
    }
    return {
      ...interest,
      enrolmentStatus: EnrolmentStatus.NOT_ENROLLED,
    };
  } else {
    await joinInterest(interestId, enthusiast);
    const challenge = await getSanitizedInterest();
    if (!challenge) {
      throw new Error('Interest not found');
    }
    return {
      ...challenge,
      enrolmentStatus: EnrolmentStatus.ENROLLED,
    };
  }
};

// Get all enrolments by interest id
export const getAllEnrolmentsByInterestId = async (interestId: string): Promise<UserInfo[]> => {
  const interestDoc = await admin.firestore().collection(INTEREST_COLLECTION).doc(interestId).get();
  const enrollments = interestDoc.data()?.enrollments || [];
  return enrollments;
};
