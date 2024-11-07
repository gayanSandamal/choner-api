import * as functions from 'firebase-functions';
import {getAuthenticatedUser, getCreatedUserDTO} from '../utils/authUtils';
import {handleError} from '../utils/errorHandler';
import {
  bulkApproveChallengeParticipants,
  changeChallengeParticipantStatus,
  createChallenge,
  deleteChallenge,
  getChallenge,
  getPaginatedChallenges,
  toggleChallengeParticipation,
  updateChallenge} from '../services/challengesService';
import {
  Challenge,
  ChallengeState,
  ChallengeType,
  GetPaginatedChallengesResponse,
  Participant,
  UserChallengeStatus,
} from '../types/Challenge';
import admin from '../admin/firebaseAdmin';
import {now} from '../utils/commonUtils';
import {deleteAllCommentsHandler} from './commentHandlers';

// Create Challenge Handler
export const createChallengeHandler = functions.https.onCall(async (data, context) => {
  try {
    const user = await getAuthenticatedUser(context);

    const {participantStatus, participationRangeId, description, location, joinAnyone, challengeAt} = data;

    if (!participantStatus || !participationRangeId || !description || !location || !challengeAt) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
    }

    const createdUser = {
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
      createdUser,
      participantLimitReached: data.participantLimitReached || false,
      joinAnyone: joinAnyone || false,
      deleted: false,
      approvedByCreator: false,
      participants: [createdUser],
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

    const {id, challengeState, participationRangeId, description, location, challengeAt} = data;

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
      updatedAt: now,
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

    const {id} = data;
    if (!id) {
      throw new functions.https.HttpsError('invalid-argument', 'Challenge ID is required.');
    }

    const existingChallenge = await getChallenge(id);
    if (!existingChallenge) {
      throw new functions.https.HttpsError('not-found', 'Challenge not found.');
    }

    await deleteChallenge(id);

    const deletedCommentCount = await deleteAllCommentsHandler(id);

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

    const participant = getCreatedUserDTO(user);
    const joined = await toggleChallengeParticipation(challengeId, participant);

    return {
      message: `Challenge ${joined ? 'joined' : 'left'} successfully`,
      joined,
    };
  } catch (error) {
    return handleError(error);
  }
});

// Bulk Approve Challenge Participants Handler
// Only the array with uids is passed to the function and gets approved
export const bulkApproveChallengeParticipantsHandler = functions.https.onCall(async (data, context) => {
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

    await bulkApproveChallengeParticipants(challengeId, uids);
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
