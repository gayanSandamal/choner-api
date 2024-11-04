import * as functions from "firebase-functions";
import {getAuthenticatedUser, getCreatedUserDTO} from "../utils/authUtils";
import {handleError} from "../utils/errorHandler";
import {
  createInterest,
  updateInterest,
  deleteInterest,
  getInterest,
  getPaginatedInterests,
  getPaginatedUserSpecificInterests,
  publishScheduledInterests,
} from "../services/interestService";
import {GetPaginatedInterestsResponse, Interest} from "../types/Interest";
import {PostVisibilityStatus} from "../types/Post";
import {now} from "../utils/commonUtils";
import {deleteAllCommentsHandler} from "./commentHandlers";

// Create Interest Handler
export const createInterestHandler = functions.https.onCall(async (data, context) => {
  try {
    const user = await getAuthenticatedUser(context);
    const {title, description, scheduledAt, visibility} = data;

    if (!title || !description) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
    }

    const newInterest: Omit<Interest, "id"> = {
      title,
      description,
      createdBy: user.uid,
      createdAt: now,
      visibility: scheduledAt ? PostVisibilityStatus.Scheduled : visibility || PostVisibilityStatus.Public,
      deleted: false,
      votes: [],
      comments: [],
      enrolments: [],
      createdUser: getCreatedUserDTO(user),
      ...(scheduledAt && {scheduledAt: new Date(scheduledAt)}),
    };

    const createdInterest = await createInterest(newInterest);
    return {message: "Interest created successfully", data: createdInterest};
  } catch (error) {
    return handleError(error);
  }
});

// Update Interest Handler
export const updateInterestHandler = functions.https.onCall(async (data, context) => {
  try {
    const user = await getAuthenticatedUser(context);
    const {id, title, description, scheduledAt, visibility} = data;

    if (!id || !title || !description) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
    }

    const existingInterest = await getInterest(id);
    if (!existingInterest) {
      throw new functions.https.HttpsError("not-found", "Interest post not found.");
    }

    if (existingInterest.createdBy !== user.uid) {
      throw new functions.https.HttpsError("permission-denied", "You do not have permission to update this interest post.");
    }

    if (existingInterest.visibility === "public") {
      throw new functions.https.HttpsError("permission-denied", "Cannot update a published interest post. Only delete.");
    }

    const updatedData: Partial<Interest> = {
      title,
      description,
      visibility: scheduledAt ? PostVisibilityStatus.Scheduled : visibility || existingInterest.visibility,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : existingInterest.scheduledAt,
      updatedAt: now,
    };

    const updatedInterest = await updateInterest(id, updatedData);
    return {message: "Interest updated successfully", data: updatedInterest.data() as Interest};
  } catch (error) {
    return handleError(error);
  }
});

// Delete Interest Handler
export const deleteInterestHandler = functions.https.onCall(async (data, context) => {
  try {
    const user = await getAuthenticatedUser(context);
    const {id} = data;

    if (!id) {
      throw new functions.https.HttpsError("invalid-argument", "Missing interest ID.");
    }

    const existingInterest = await getInterest(id);
    if (!existingInterest) {
      throw new functions.https.HttpsError("not-found", "Interest post not found.");
    }

    if (existingInterest.createdBy !== user.uid) {
      throw new functions.https.HttpsError("permission-denied", "You do not have permission to delete this interest post.");
    }

    await deleteInterest(id);

    const deletedCommentCount = await deleteAllCommentsHandler(id);

    return {message: `Interest and ${deletedCommentCount} comments have been deleted successfully`};
  } catch (error) {
    return handleError(error);
  }
});

// Get Paginated Interests Handler
export const getPaginatedInterestsHandler = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Unauthenticated user.");
    }
    const {pageSize = 10, lastVisible, visibility = PostVisibilityStatus.Public} = data;

    const response: GetPaginatedInterestsResponse = await getPaginatedInterests(pageSize, lastVisible, visibility);
    return response;
  } catch (error) {
    return handleError(error);
  }
});

// Get Paginated User-Specific Interests Handler
export const getPaginatedUserSpecificInterestsHandler = functions.https.onCall(async (data, context) => {
  try {
    const user = await getAuthenticatedUser(context);
    const {pageSize = 10, lastVisible, visibility = PostVisibilityStatus.Public} = data;

    const response: GetPaginatedInterestsResponse = await getPaginatedUserSpecificInterests(
      user.uid,
      pageSize,
      lastVisible,
      visibility
    );
    return response;
  } catch (error) {
    return handleError(error);
  }
});

// Scheduled function to publish scheduled interests
export const publishScheduledInterestsJobHandler = functions.pubsub.schedule("every 5 minutes").onRun(async () => {
  try {
    const publishedCount = await publishScheduledInterests();
    console.log(`${publishedCount} scheduled interests published successfully`);
    return null;
  } catch (error) {
    console.error("Error publishing scheduled interests:", error);
    return null;
  }
});
