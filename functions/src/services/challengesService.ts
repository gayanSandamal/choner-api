// src/services/challengeService.ts

import admin from '../admin/firebaseAdmin';
import {Challenge, UserChallengeStatus} from '../types/Challenge';
import {UserInfo} from '../types/User';

const CHALLENGE_COLLECTION = 'challenges';

export const createChallenge = async (challengeData: Omit<Challenge, 'id'>): Promise<Challenge> => {
  const challengeRef = admin.firestore().collection(CHALLENGE_COLLECTION).doc();
  const newChallenge: Challenge = {...challengeData, id: challengeRef.id};
  await challengeRef.set(newChallenge);
  return newChallenge;
};

export const updateChallenge = async (
  challengeId: string, challengeData: Partial<Challenge>
): Promise<FirebaseFirestore.DocumentSnapshot<Challenge>> => {
  const challengeRef = admin.firestore().collection(CHALLENGE_COLLECTION).doc(challengeId);
  await challengeRef.update(challengeData);
  return challengeRef.get() as unknown as FirebaseFirestore.DocumentSnapshot<Challenge>;
};

export const deleteChallenge = async (challengeId: string): Promise<void> => {
  const challengeRef = admin.firestore().collection(CHALLENGE_COLLECTION).doc(challengeId);
  await challengeRef.delete();
};

export const getChallenge = async (challengeId: string): Promise<Challenge | null> => {
  const challengeDoc = await admin.firestore().collection(CHALLENGE_COLLECTION).doc(challengeId).get();
  return challengeDoc.exists ? (challengeDoc.data() as Challenge) : null;
};

export const getPaginatedChallenges = async (
  pageSize: number,
  lastVisible: string | undefined,
  uid: string
): Promise<{ challenges: Challenge[], lastVisible: string | null, hasMore: boolean }> => {
  let query = admin.firestore()
    .collection('challenges')
    .where('deleted', '==', false)
    .orderBy('createdAt', 'desc')
    .limit(pageSize);

  if (lastVisible) {
    const lastVisibleDoc = await admin.firestore().collection('challenges').doc(lastVisible).get();
    if (lastVisibleDoc.exists) {
      query = query.startAfter(lastVisibleDoc);
    } else {
      throw new Error('Invalid lastVisible document ID.');
    }
  }

  const snapshot = await query.get();
  const challenges = await Promise.all(snapshot.docs.map(async (doc) => {
    const data = doc.data() as Challenge;
    let participantStatus: UserChallengeStatus = UserChallengeStatus.NOT_JOINED; // Default status

    // Check if the user is a participant and get their status
    if (data.participants) {
      const participant = data.participants.find((p) => p.uid === uid);
      if (participant) {
        participantStatus = participant.participantStatus;
      }
    }

    const response = {
      ...data,
      participantStatus, // Attach the participantStatus to the challenge data
    };

    delete response.participants; // Remove participants from the response

    return {
      ...data,
      participantStatus, // Attach the participantStatus to the challenge data
    };
  }));

  return {
    challenges,
    lastVisible: snapshot.docs[snapshot.docs.length - 1]?.id || null,
    hasMore: challenges.length === pageSize,
  };
};

// Join a challenge by adding the current user to the participants list
const joinChallenge = async (challengeId: string, participant: UserInfo): Promise<any> => {
  const challengeRef = admin.firestore().collection(CHALLENGE_COLLECTION).doc(challengeId);

  const participation = {
    ...participant,
    participantStatus: UserChallengeStatus.JOINED,
  };

  await challengeRef.update({
    participants: admin.firestore.FieldValue.arrayUnion(participation),
  });
};

// Leave a challenge by removing the current user from the participants list
const leaveChallenge = async (challengeId: string, participant: UserInfo): Promise<void> => {
  const challengeRef = admin.firestore().collection(CHALLENGE_COLLECTION).doc(challengeId);
  await challengeRef.update({
    participants: admin.firestore.FieldValue.arrayRemove(participant),
  });
};

// Join or leave a challenge based on the current participation status
// If the current user is already a participant, they will be removed from the participants list or vice versa
export const toggleChallengeParticipation = async (challengeId: string, participant: UserInfo): Promise<Challenge> => {
  const challengeRef = admin.firestore().collection(CHALLENGE_COLLECTION).doc(challengeId);
  const challengeDoc = await challengeRef.get();
  const participants = challengeDoc.data()?.participants || [];

  if (participants.some((p: UserInfo) => p.uid === participant.uid)) {
    await leaveChallenge(challengeId, participant);
    const challenge = await getChallengeById(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }
    return {
      ...challenge,
      participantStatus: UserChallengeStatus.JOINED,
    };
  } else {
    await joinChallenge(challengeId, participant);
    const challenge = await getChallengeById(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }
    return {
      ...challenge,
      participantStatus: UserChallengeStatus.NOT_JOINED,
    };
  }
};

// Get all participants of a challenge
export const getChallengeParticipants = async (challengeId: string): Promise<UserInfo[]> => {
  const challengeDoc = await admin.firestore().collection(CHALLENGE_COLLECTION).doc(challengeId).get();
  return challengeDoc.data()?.participants || [];
};

// Get single challenge by challengeId
export const getChallengeById = async (challengeId: string): Promise<Challenge | null> => {
  const challengeDoc = await admin.firestore().collection(CHALLENGE_COLLECTION).doc(challengeId).get();
  return challengeDoc.exists ? (challengeDoc.data() as Challenge) : null;
};

// Bulk approve or reject participantStatus for all participants of a challenge based on uid
export const bulkApproveChallengeParticipants = async (
  challengeId: string,
  uids: string[]
): Promise<void> => {
  const challengeRef = admin.firestore().collection(CHALLENGE_COLLECTION).doc(challengeId);
  const challengeDoc = await challengeRef.get();

  const participants = challengeDoc.data()?.participants || [];

  const updatedParticipants = participants.map((p: UserInfo) => {
    if (uids.includes(p.uid)) {
      return {...p, participantStatus: UserChallengeStatus.COMPLETED, approvedByCreator: true};
    } else {
      return {...p, participantStatus: UserChallengeStatus.NOT_COMPLETED, approvedByCreator: true};
    }
  });

  await challengeRef.update({participants: updatedParticipants});
};

// Change participantStatus of a participant based on uid
export const changeChallengeParticipantStatus = async (
  challengeId: string,
  uid: string,
  participantStatus: UserChallengeStatus
): Promise<void> => {
  const challengeRef = admin.firestore().collection(CHALLENGE_COLLECTION).doc(challengeId);
  const challengeDoc = await challengeRef.get();

  const participants = challengeDoc.data()?.participants || [];

  const updatedParticipants = participants.map((p: UserInfo) => {
    if (p.uid === uid) {
      return {...p, participantStatus};
    } else {
      return p;
    }
  });

  await challengeRef.update({participants: updatedParticipants});
};
