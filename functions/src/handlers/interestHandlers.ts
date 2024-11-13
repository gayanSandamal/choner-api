import * as functions from 'firebase-functions';
import {getCreatedUserDTO} from '../utils/authUtils';
import {handleError} from '../utils/errorHandler';
import {
  createInterest,
  updateInterest,
  deleteInterest,
  getInterest,
  getPaginatedInterests,
  getPaginatedUserSpecificInterests,
  publishScheduledInterests,
  toggleInterestEnrolment,
  getAllEnrolmentsByInterestId,
} from '../services/interestService';
import {GetPaginatedInterestsResponse, Interest} from '../types/Interest';
import {PostVisibilityStatus} from '../types/Post';
import {now, updatedTime} from '../utils/commonUtils';
import {deleteAllCommentsHandler} from './commentHandlers';
import { UserInfo } from '../types/User';

// Create Interest Handler
export const createInterestHandler = functions.https.onCall(async (data, context) => {
  try {
    const {title, description, scheduledAt, visibility, location} = data;

    if (!title || !description) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
    }

    const newInterest: Omit<Interest, 'id'> = {
      title,
      description,
      createdBy: getCreatedUserDTO(context?.auth as unknown as UserInfo),
      createdAt: now,
      visibility: scheduledAt ? PostVisibilityStatus.Scheduled : visibility || PostVisibilityStatus.Public,
      deleted: false,
      votes: [],
      comments: [],
      enrolments: [],
      ...(scheduledAt && {scheduledAt: new Date(scheduledAt)}),
      location: location || null,
    };

    const createdInterest = await createInterest(newInterest);
    return {message: 'Interest created successfully', data: createdInterest};
  } catch (error) {
    return handleError(error);
  }
});

// Update Interest Handler
export const updateInterestHandler = functions.https.onCall(async (data, context) => {
  try {
    const user = getCreatedUserDTO(context?.auth as unknown as UserInfo);
    const {id, title, description, scheduledAt, visibility} = data;

    if (!id || !title || !description) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
    }

    const existingInterest = await getInterest(id);
    if (!existingInterest) {
      throw new functions.https.HttpsError('not-found', 'Interest post not found.');
    }

    if (existingInterest.createdBy.uid !== user.uid) {
      throw new functions.https.HttpsError('permission-denied', 'You do not have permission to update this interest post.');
    }

    if (existingInterest.visibility === 'public') {
      throw new functions.https.HttpsError('permission-denied', 'Cannot update a published interest post. Only delete.');
    }

    const updatedData: Partial<Interest> = {
      title,
      description,
      visibility: scheduledAt ? PostVisibilityStatus.Scheduled : visibility || existingInterest.visibility,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : existingInterest.scheduledAt,
      updatedAt: updatedTime,
    };

    const updatedInterest = await updateInterest(id, updatedData);
    return {message: 'Interest updated successfully', data: updatedInterest.data() as Interest};
  } catch (error) {
    return handleError(error);
  }
});

// Delete Interest Handler
export const deleteInterestHandler = functions.https.onCall(async (data, context) => {
  try {
    const user = getCreatedUserDTO(context?.auth as unknown as UserInfo);
    const {id, type} = data;

    if (!id) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing interest ID.');
    }

    const existingInterest = await getInterest(id);
    if (!existingInterest) {
      throw new functions.https.HttpsError('not-found', 'Interest post not found.');
    }

    if (existingInterest.createdBy.uid !== user.uid) {
      throw new functions.https.HttpsError('permission-denied', 'You do not have permission to delete this interest post.');
    }

    await deleteInterest(id);

    const deletedCommentCount = await deleteAllCommentsHandler(id, type);

    return {message: `Interest and ${deletedCommentCount} comments have been deleted successfully`};
  } catch (error) {
    return handleError(error);
  }
});

// Get Paginated Interests Handler
export const getPaginatedInterestsHandler = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
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
    const user = getCreatedUserDTO(context?.auth as unknown as UserInfo);
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
export const publishScheduledInterestsJobHandler = functions.pubsub.schedule('every 5 minutes').onRun(async () => {
  try {
    const publishedCount = await publishScheduledInterests();
    console.log(`${publishedCount} scheduled interests published successfully`);
    return null;
  } catch (error) {
    console.error('Error publishing scheduled interests:', error);
    return null;
  }
});

// Toggle interest enrolment handler
export const toggleInterestEnrolmentHandler = functions.https.onCall(async (data, context) => {
  try {
    const user = getCreatedUserDTO(context?.auth as unknown as UserInfo);

    const {interestId} = data;
    if (!interestId) {
      throw new functions.https.HttpsError('invalid-argument', 'Interest ID is required.');
    }

    const existingInterest = await getInterest(interestId);
    if (!existingInterest) {
      throw new functions.https.HttpsError('not-found', 'Challenge not found.');
    }

    const toggledInterest = await toggleInterestEnrolment(existingInterest, user);

    return {
      message: `Interest ${toggledInterest.enrolmentStatus}`,
      data: toggledInterest,
    };
  } catch (error) {
    return handleError(error);
  }
});

// Get all enrolled enthusiasts of an interest
export const getEnrolledEnthusiastsHandler = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
    }

    const {interestId} = data;
    if (!interestId) {
      throw new functions.https.HttpsError('invalid-argument', 'Interest ID is required.');
    }

    const enrolledEnthusiasts = await getAllEnrolmentsByInterestId(interestId);

    return {
      message: 'Enrolled interest enthusiasts retrieved successfully',
      data: enrolledEnthusiasts,
    };
  } catch (error) {
    return handleError(error);
  }
});
