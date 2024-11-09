import * as email from './handlers/emailHandlers';
import * as comments from './handlers/commentHandlers';
import * as replies from './handlers/replyHandlers';
import * as interst from './handlers/interestHandlers';
import * as community from './handlers/communityHandlers';
import * as user from './handlers/userHandlers';
import * as docsHandler from './handlers/addKeyToDocumentsHandlers';
import * as challenge from './handlers/challengeHandlers';

export const {
  createUserDocumentHandler,
  resendOtpHandler,
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
  getAllChallengeParticipantsHandler,
  toggleChallengeParticipationHandler,
  getParticipantsToBeJoinedHandler,
  bulkJoinApproveChallengeParticipantsHandler,
  bulkApproveCompletionChallengeParticipantsHandler,
  changeChallengeParticipantStatusHandler,
  startScheduledChallengesJobHandler,
} = challenge;
