import * as functions from 'firebase-functions';
import {getAuthenticatedUser, getCreatedUserDTO} from '../utils/authUtils';
import {handleError} from '../utils/errorHandler';
import {
  bulkApproveJoinChallengeParticipants,
  bulkApproveCompletionChallengeParticipants,
  changeChallengeParticipantStatus,
  createChallenge,
  deleteChallenge,
  getChallenge,
  getPaginatedChallenges,
  requestToJoinChallenge,
  startScheduledChallenges,
  toggleChallengeParticipation,
  updateChallenge,
  getAllJoinedChallengeParticipants,
} from '../services/challengesService';
import {
  Challenge,
  ChallengeState,
  ChallengeType,
  GetPaginatedChallengesResponse,
  Participant,
  ParticipantRange,
  UserChallengeStatus,
} from '../types/Challenge';
import admin from '../admin/firebaseAdmin';
import {now, updatedTime} from '../utils/commonUtils';
import {deleteAllCommentsHandler} from './commentHandlers';
import {PARTICIPANT_RANGES} from '../constants/challengeContstants';

// Create Challenge Handler
export const createChallengeHandler = functions.https.onCall(async (data, context) => {
  try {
    const user = await getAuthenticatedUser(context);

    const {participantStatus, participationRangeId, description, location, joinAnyone, challengeAt} = data;

    if (!participantStatus || !participationRangeId || !description || !location || !challengeAt) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
    }

    const createdBy = {
      ...getCreatedUserDTO(user),
      participantStatus,
    } as Participant;

    const newChallengeData: Omit<Challenge, 'id'> = {
      challengeState: ChallengeState.SCHEDULED,
      type: ChallengeType.ON_LOCATION,
      participationRangeId,
      description,
      location,
      createdAt: now,
      challengeAt: admin.firestore.Timestamp.fromDate(new Date(challengeAt)),
      createdBy,
      participantLimitReached: false,
      joinAnyone: joinAnyone || false,
      deleted: false,
      approvedByCreator: false,
      participants: [createdBy],
      participantStatus: UserChallengeStatus.JOINED,
    };

    const createdChallenge = await createChallenge(newChallengeData);
    return {message: 'Challenge created successfully', data: createdChallenge};
  } catch (error) {
    return handleError(error);
  }
});

// Update Challenge Handler
export const updateChallengeHandler = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
    }

    const {id, challengeState, participationRangeId, description, location, challengeAt, joinAnyone} = data;

    if (
      !id || !challengeState || !participationRangeId || !description || !location || !challengeAt
    ) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
    }

    const existingChallenge = await getChallenge(id);
    if (!existingChallenge) {
      throw new functions.https.HttpsError('not-found', 'Challenge not found.');
    }

    const updatedChallengeData: Partial<Challenge> = {
      challengeState,
      participationRangeId,
      description,
      location,
      challengeAt: admin.firestore.Timestamp.fromDate(new Date(challengeAt)),
      updatedAt: updatedTime,
      joinAnyone,
    };

    const updatedChallenge = await updateChallenge(id, updatedChallengeData);
    return {message: 'Challenge updated successfully', data: updatedChallenge};
  } catch (error) {
    return handleError(error);
  }
});

// Delete Challenge Handler
export const deleteChallengeHandler = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
    }

    const {id, type} = data;
    if (!id) {
      throw new functions.https.HttpsError('invalid-argument', 'Challenge ID is required.');
    }

    const existingChallenge = await getChallenge(id);
    if (!existingChallenge) {
      throw new functions.https.HttpsError('not-found', 'Challenge not found.');
    }

    await deleteChallenge(id);

    const deletedCommentCount = await deleteAllCommentsHandler(id, type);

    return {message: `Challenge and ${deletedCommentCount} comments have been deleted successfully`};
  } catch (error) {
    return handleError(error);
  }
});

// Get Challenge Handler
export const getChallengeHandler = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
    }

    const {id} = data;
    if (!id) {
      throw new functions.https.HttpsError('invalid-argument', 'Challenge ID is required.');
    }

    const challenge = await getChallenge(id);
    if (!challenge) {
      throw new functions.https.HttpsError('not-found', 'Challenge not found.');
    }

    return {message: 'Challenge retrieved successfully', data: challenge};
  } catch (error) {
    return handleError(error);
  }
});

// Get Paginated Challenges Handler
export const getPaginatedChallengesHandler = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
    }

    const {pageSize = 10, lastVisible} = data;

    const response: GetPaginatedChallengesResponse = await getPaginatedChallenges(pageSize, lastVisible, context.auth.uid);
    return response;
  } catch (error) {
    return handleError(error);
  }
});

// Toggle Challenge Participation Status Handler
export const toggleChallengeParticipationHandler = functions.https.onCall(async (data, context) => {
  try {
    const user = await getAuthenticatedUser(context);

    const {challengeId} = data;
    if (!challengeId) {
      throw new functions.https.HttpsError('invalid-argument', 'Challenge ID is required.');
    }

    const existingChallenge = await getChallenge(challengeId);
    if (!existingChallenge) {
      throw new functions.https.HttpsError('not-found', 'Challenge not found.');
    }

    const joinAnyone = existingChallenge?.joinAnyone || false;
    const participantSize = existingChallenge?.participants?.length || 0;

    const participantRange = PARTICIPANT_RANGES.find(
      (range) => Number(range.value) === Number(existingChallenge.participationRangeId)
    ) as ParticipantRange;
    const maxParticipants = Number(participantRange?.label.split(' - ')[1]);

    if (participantSize >= maxParticipants) {
      return {
        message: 'Participant limit reached',
        data: {
          ...existingChallenge,
          participantLimitReached: true,
        },
      };
    }

    if (joinAnyone) {
      const participant = getCreatedUserDTO(user);
      const challenge = await toggleChallengeParticipation(
        existingChallenge,
        participant,
        user.uid
      );

      return {
        message: `Challenge ${challenge.participantStatus ? 'joined' : 'left'} successfully`,
        data: challenge,
      };
    } else {
      await requestToJoinChallenge(challengeId, user);
      return {
        message: 'Requested from host to approve the participation',
        data: {
          ...existingChallenge,
          participantStatus: UserChallengeStatus.PENDING_REQUEST,
        },
      };
    }
  } catch (error) {
    return handleError(error);
  }
});

// Get Participants who requested to join the challenge
export const getParticipantsToBeJoinedHandler = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
    }

    const {challengeId} = data;
    if (!challengeId) {
      throw new functions.https.HttpsError('invalid-argument', 'Challenge ID is required.');
    }

    const existingChallenge = await getChallenge(challengeId);
    if (!existingChallenge) {
      throw new functions.https.HttpsError('not-found', 'Challenge not found.');
    }

    return {
      message: 'Participants who requested to join the challenge retrieved successfully',
      data: existingChallenge.participantsToBBeJoined,
    };
  } catch (error) {
    return handleError(error);
  }
});

// Get all joined participants of a challenge
export const getAllJoinedChallengeParticipantsHandler = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
    }

    const {challengeId} = data;
    if (!challengeId) {
      throw new functions.https.HttpsError('invalid-argument', 'Challenge ID is required.');
    }

    const joinedChallengeParticipants = await getAllJoinedChallengeParticipants(challengeId);

    return {
      message: 'Joined challenge participants retrieved successfully',
      data: joinedChallengeParticipants,
    };
  } catch (error) {
    return handleError(error);
  }
});

// Move selected participants from participantsToBBeJoined to participants
export const bulkApproveJoinChallengeParticipantsHandler = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
    }

    const {challengeId, uids}: {challengeId: string, uids: string[]} = data;
    if (!challengeId || !uids) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
    }

    if (!Array.isArray(uids) || uids.length > 0) {
      throw new functions.https.HttpsError('invalid-argument', 'uids should be an array of strings or cannot be empty.');
    }

    const existingChallenge = await getChallenge(challengeId);
    if (!existingChallenge) {
      throw new functions.https.HttpsError('not-found', 'Challenge not found or recently removed.');
    }

    const participantSize = existingChallenge?.participants?.length || 0;

    const participantRange = PARTICIPANT_RANGES.find(
      (range) => Number(range.value) === Number(existingChallenge.participationRangeId)
    ) as ParticipantRange;
    const maxParticipants = Number(participantRange?.label.split(' - ')[1]);

    if ((participantSize + uids.length) >= maxParticipants) {
      return {
        message: 'Participant limit reached',
        data: {
          ...existingChallenge,
          participantLimitReached: true,
        },
      };
    }

    await bulkApproveJoinChallengeParticipants(challengeId, uids);

    return {message: 'Challenge participants approved successfully'};
  } catch (error) {
    return handleError(error);
  }
});

// Bulk Approve Challenge Participants Handler
// Only the array with uids is passed to the function and gets approved
export const bulkApproveCompletionChallengeParticipantsHandler = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
    }

    const {challengeId, uids} = data;
    if (!challengeId || !uids) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
    }

    if (!Array.isArray(uids) || uids.length > 0) {
      throw new functions.https.HttpsError('invalid-argument', 'uids should be an array of strings or cannot be empty.');
    }

    const existingChallenge = await getChallenge(challengeId);
    if (!existingChallenge) {
      throw new functions.https.HttpsError('not-found', 'Challenge not found or recently removed.');
    }

    await bulkApproveCompletionChallengeParticipants(challengeId, uids);
    return {message: 'Challenge participants approved successfully'};
  } catch (error) {
    return handleError(error);
  }
});

// Change participantStatus of a participant based on uid
export const changeChallengeParticipantStatusHandler = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
    }

    const {challengeId, uid, participantStatus} = data;
    if (!challengeId || !uid || !participantStatus) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
    }

    await changeChallengeParticipantStatus(challengeId, uid, participantStatus);
    return {message: `Challenge participant status updated to ${participantStatus} successfully`};
  } catch (error) {
    return handleError(error);
  }
});

// Start scheduled challenges
export const startScheduledChallengesJobHandler = functions.pubsub.schedule('every 5 minutes').onRun(async () => {
  try {
    const startedChallengesCount = await startScheduledChallenges();
    console.log(`${startedChallengesCount} challenges set as on-going`);
    return null;
  } catch (error) {
    console.error('Error starting challenges:', error);
    return null;
  }
});
