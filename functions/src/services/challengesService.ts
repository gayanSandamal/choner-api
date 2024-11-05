// src/services/challengeService.ts

import admin from '../admin/firebaseAdmin';
import {Challenge} from '../types/Challenge';
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
  pageSize: number, lastVisible: string | undefined): Promise<{challenges: Challenge[], lastVisible: string | undefined
  }> => {
  let query = admin.firestore()
    .collection(CHALLENGE_COLLECTION)
    .where('deleted', '==', false)
    .orderBy('createdAt', 'desc')
    .limit(pageSize);

  if (lastVisible) {
    const lastVisibleDoc = await admin.firestore().collection(CHALLENGE_COLLECTION).doc(lastVisible).get();
    if (lastVisibleDoc.exists) {
      query = query.startAfter(lastVisibleDoc);
    } else {
      throw new Error('Invalid lastVisible document ID.');
    }
  }

  const snapshot = await query.get();
  const challenges: Challenge[] = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()} as Challenge));

  return {
    challenges,
    lastVisible: snapshot.docs[snapshot.docs.length - 1]?.id,
  };
};

// Join a challenge by adding the current user to the participants list
const joinChallenge = async (challengeId: string, participant: UserInfo): Promise<any> => {
  const challengeRef = admin.firestore().collection(CHALLENGE_COLLECTION).doc(challengeId);

  await challengeRef.update({
    participants: admin.firestore.FieldValue.arrayUnion(participant),
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
export const toggleChallengeParticipation = async (challengeId: string, participant: UserInfo): Promise<boolean> => {
  const challengeRef = admin.firestore().collection(CHALLENGE_COLLECTION).doc(challengeId);
  const challengeDoc = await challengeRef.get();
  const participants = challengeDoc.data()?.participants || [];

  if (participants.some((p: UserInfo) => p.uid === participant.uid)) {
    await leaveChallenge(challengeId, participant);
    return false;
  } else {
    await joinChallenge(challengeId, participant);
    return true;
  }
};
