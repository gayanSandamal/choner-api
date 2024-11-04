import * as functions from "firebase-functions";
import {getAuthenticatedUser, getCreatedUserDTO} from "../utils/authUtils";
import {handleError} from "../utils/errorHandler";
import {createChallenge, deleteChallenge, getChallenge, getPaginatedChallenges,
  updateChallenge} from "../services/challengesService";
import {Challenge} from "../types/Challenge";
import admin from "../admin/firebaseAdmin";
import {now} from "../utils/commonUtils";
import {deleteAllCommentsHandler} from "./commentHandlers";

// Create Challenge Handler
export const createChallengeHandler = functions.https.onCall(async (data, context) => {
  try {
    const user = await getAuthenticatedUser(context);

    const {participantStatus, challengeState, type, participationRangeId, description, location, createdAt, challengeAt} = data;

    if (!participantStatus || !challengeState || !type || !participationRangeId || !description || !location || !challengeAt) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
    }

    const newChallengeData: Omit<Challenge, "id"> = {
      participantStatus,
      challengeState,
      type,
      participationRangeId,
      description,
      location,
      createdAt: createdAt || admin.firestore.Timestamp.now(),
      challengeAt: admin.firestore.Timestamp.fromDate(new Date(challengeAt)),
      createdUser: getCreatedUserDTO(user),
      participantLimitReached: data.participantLimitReached || false,
      deleted: false,
    };

    const createdChallenge = await createChallenge(newChallengeData);
    return {message: "Challenge created successfully", data: createdChallenge};
  } catch (error) {
    return handleError(error);
  }
});

// Update Challenge Handler
export const updateChallengeHandler = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Unauthenticated user.");
    }

    const {id, participantStatus, challengeState, type, participationRangeId, description, location, challengeAt} = data;

    if (
      !id || !participantStatus || !challengeState || !type || !participationRangeId || !description || !location || !challengeAt
    ) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
    }

    const existingChallenge = await getChallenge(id);
    if (!existingChallenge) {
      throw new functions.https.HttpsError("not-found", "Challenge not found.");
    }

    const updatedChallengeData: Partial<Challenge> = {
      participantStatus,
      challengeState,
      type,
      participationRangeId,
      description,
      location,
      challengeAt: admin.firestore.Timestamp.fromDate(new Date(challengeAt)),
      updatedAt: now,
    };

    const updatedChallenge = await updateChallenge(id, updatedChallengeData);
    return {message: "Challenge updated successfully", data: updatedChallenge};
  } catch (error) {
    return handleError(error);
  }
});

// Delete Challenge Handler
export const deleteChallengeHandler = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Unauthenticated user.");
    }

    const {id} = data;
    if (!id) {
      throw new functions.https.HttpsError("invalid-argument", "Challenge ID is required.");
    }

    const existingChallenge = await getChallenge(id);
    if (!existingChallenge) {
      throw new functions.https.HttpsError("not-found", "Challenge not found.");
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
      throw new functions.https.HttpsError("unauthenticated", "Unauthenticated user.");
    }

    const {id} = data;
    if (!id) {
      throw new functions.https.HttpsError("invalid-argument", "Challenge ID is required.");
    }

    const challenge = await getChallenge(id);
    if (!challenge) {
      throw new functions.https.HttpsError("not-found", "Challenge not found.");
    }

    return {message: "Challenge retrieved successfully", data: challenge};
  } catch (error) {
    return handleError(error);
  }
});

// Get Paginated Challenges Handler
export const getPaginatedChallengesHandler = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Unauthenticated user.");
    }

    const {pageSize, lastVisible} = data;
    if (!pageSize) {
      throw new functions.https.HttpsError("invalid-argument", "pageSize is required.");
    }

    const {challenges, lastVisible: newLastVisible} = await getPaginatedChallenges(pageSize, lastVisible);
    return {message: "Challenges retrieved successfully", data: challenges, lastVisible: newLastVisible};
  } catch (error) {
    return handleError(error);
  }
});
