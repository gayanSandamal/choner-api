import * as email from './handlers/emailHandlers';
import * as comments from './handlers/commentHandlers';
import * as replies from './handlers/replyHandlers';
import * as interst from './handlers/interestHandlers';
import * as community from './handlers/communityHandlers';
import * as user from './handlers/userHandlers';
import * as docsHandler from './handlers/addKeyToDocumentsHandlers';
import * as challenge from './handlers/challengeHandlers';
import * as form from './handlers/formHandlers';
import * as dashboard from './handlers/dashboardHandlers';

export const {
  createUserDocumentHandler,
  getUserHandler,
  setUserHandler,
  deleteUserHandler,
} = user;

export const {
  sendEmailHandler,
} = email;

export const {
  createInterestHandler,
  updateInterestHandler,
  deleteInterestHandler,
  getPaginatedInterestsHandler,
  getPaginatedUserSpecificInterestsHandler,
  publishScheduledInterestsJobHandler,
  toggleInterestEnrolmentHandler,
  getEnrolledEnthusiastsHandler,
} = interst;

export const {
  createCommunityPostHandler,
  updateCommunityPostHandler,
  deleteCommunityPostHandler,
  getPaginatedCommunityPostsHandler,
  getPaginatedUserSpecificCommunityPostsHandler,
  publishScheduledCommunityPostsHandler,
} = community;

export const {
  createCommentHandler,
  updateCommentHandler,
  deleteCommentHandler,
  getCommentsHandler,
  voteUpvoteCommentHandler,
} = comments;

export const {
  createReplyHandler,
  updateReplyHandler,
  deleteReplyHandler,
  getRepliesHandler,
  voteUpvoteReplyHandler,
} = replies;

export const {
  addKeyToDocumentsHandler,
} = docsHandler;

export const {
  createChallengeHandler,
  updateChallengeHandler,
  deleteChallengeHandler,
  getChallengeHandler,
  getPaginatedChallengesHandler,
  getAllJoinedChallengeParticipantsHandler,
  toggleChallengeParticipationHandler,
  getParticipantsToBeJoinedHandler,
  bulkApproveJoinChallengeParticipantsHandler,
  bulkApproveCompletionChallengeParticipantsHandler,
  changeChallengeParticipantStatusHandler,
  startScheduledChallengesJobHandler,
} = challenge;

export const {
  createFormHandler,
  getLatestFormHandler,
  updateFormHandler,
  deleteFormHandler,
  submitFormHandler,
  getUserUnsubmittedFormsHandler,
} = form;

export const {
  getDashboardDataHandler,
} = dashboard;
