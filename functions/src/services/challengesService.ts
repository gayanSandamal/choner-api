// src/services/challengeService.ts

import admin from '../admin/firebaseAdmin';
import {PARTICIPANT_RANGES} from '../constants/challengeContstants';
import {Challenge, ChallengeState, Participant, ParticipantRange, UserChallengeStatus} from '../types/Challenge';
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

    let participantLimitReached = false;
    const participantSize = data?.participants?.length || 0;
    const participantRange = PARTICIPANT_RANGES.find(
      (range) => Number(range.value) === Number(data.participationRangeId)
    ) as ParticipantRange;
    const maxParticipants = Number(participantRange?.label.split(' - ')[1]);

    if (participantSize >= maxParticipants) {
      participantLimitReached = true;
    }

    const response = {
      ...data,
      participantStatus, // Attach the participantStatus to the challenge data
    };

    delete response.participants; // Remove participants from the response

    return {
      ...data,
      participantStatus, // Attach the participantStatus to the challenge data
      participantLimitReached, // Attach the participantLimitReached to the challenge data
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
export const toggleChallengeParticipation = async (
  challenge: Challenge,
  participant: UserInfo,
  uid: string
): Promise<Challenge> => {
  const challengeId = challenge?.id || '';
  const participants = challenge?.participants || [];

  const getSanitizedChallenges = async (): Promise<Challenge> => {
    const challenge = await getChallengeById(challengeId);
    // Check if the user is a participant and get their status
    const participants = challenge?.participants?.find((p) => p.uid === uid) as any;
    if (challenge) {
      challenge.participantStatus = participants;
    }
    return challenge as Challenge;
  };

  if (participants.some((p: UserInfo) => p.uid === participant.uid)) {
    await leaveChallenge(challengeId, participant);
    const challenge = await getSanitizedChallenges();
    if (!challenge) {
      throw new Error('Challenge not found');
    }
    return {
      ...challenge,
      participantStatus: UserChallengeStatus.NOT_JOINED,
    };
  } else {
    await joinChallenge(challengeId, participant);
    const challenge = await getSanitizedChallenges();
    if (!challenge) {
      throw new Error('Challenge not found');
    }
    return {
      ...challenge,
      participantStatus: UserChallengeStatus.JOINED,
    };
  }
};

// Add participant request to join challenge
export const requestToJoinChallenge = async (
  challengeId: string,
  participant: UserInfo
): Promise<void> => {
  const challengeRef = admin.firestore().collection(CHALLENGE_COLLECTION).doc(challengeId);
  const challengeDoc = await challengeRef.get();

  const participantsToBBeJoined = challengeDoc.data()?.participantsToBBeJoined || [];
  const participantIndex = participantsToBBeJoined.findIndex((p: UserInfo) => p.uid === participant.uid);

  if (participantIndex > -1) {
    participantsToBBeJoined[participantIndex] = {
      ...participantsToBBeJoined[participantIndex],
      participantStatus: UserChallengeStatus.PENDING_REQUEST,
    };
  } else {
    participantsToBBeJoined.push({
      ...participant,
      participantStatus: UserChallengeStatus.PENDING_REQUEST,
    });
  }

  await challengeRef.update({participantsToBBeJoined});
};

// Get all participants who requested to join a challenge
export const getChallengeParticipantsToBeJoined = async (challengeId: string): Promise<UserInfo[]> => {
  const challengeDoc = await admin.firestore().collection(CHALLENGE_COLLECTION).doc(challengeId).get();
  return challengeDoc.data()?.participantsToBBeJoined || [] as Challenge[];
};

// Move selected participants from participantsToBBeJoined to participants
export const bulkApproveJoinChallengeParticipants = async (
  challengeId: string,
  uids: string[]
): Promise<void> => {
  const challengeRef = admin.firestore().collection(CHALLENGE_COLLECTION).doc(challengeId);
  const challengeDoc = await challengeRef.get();

  const participants = challengeDoc.data()?.participants || [];
  const participantsToBBeJoined = challengeDoc.data()?.participantsToBBeJoined || [];

  const updatedParticipants = participants.concat(participantsToBBeJoined.filter((p: UserInfo) => uids.includes(p.uid)));
  const updatedParticipantsToBeJoined = participantsToBBeJoined.filter((p: UserInfo) => !uids.includes(p.uid));

  await challengeRef.update({participants: updatedParticipants, participantsToBBeJoined: updatedParticipantsToBeJoined});
};

// Get all joined participants of a challenge
export const getAllJoinedChallengeParticipants = async (challengeId: string): Promise<UserInfo[]> => {
  const challengeDoc = await admin.firestore().collection(CHALLENGE_COLLECTION).doc(challengeId).get();
  const challengeParticipants = challengeDoc.data()?.participants || [];
  const joinedParticipants = challengeParticipants.filter((p: Participant) => p.participantStatus === UserChallengeStatus.JOINED);
  return joinedParticipants || [];
};

// Get single challenge by challengeId
export const getChallengeById = async (challengeId: string): Promise<Challenge | null> => {
  const challengeDoc = await admin.firestore().collection(CHALLENGE_COLLECTION).doc(challengeId).get();
  return challengeDoc.exists ? (challengeDoc.data() as Challenge) : null;
};

// Bulk approve or reject participantStatus for all participants of a challenge based on uid
export const bulkApproveCompletionChallengeParticipants = async (
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

// Start scheduled challenges
export const startScheduledChallenges = async (): Promise<number> => {
  const interestsRef = admin.firestore().collection(CHALLENGE_COLLECTION);

  const scheduledInterests = await interestsRef
    .where('challengeAt', '<=', admin.firestore.Timestamp.now())
    .where('deleted', '==', false)
    .get();

  const batch = admin.firestore().batch();

  scheduledInterests.forEach((doc) => {
    batch.update(doc.ref, {challengeState: ChallengeState.ONGOING});
  });

  await batch.commit();
  return scheduledInterests.size || 0;
};
