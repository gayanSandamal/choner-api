/* eslint-disable */
import * as user from "./user";
import * as email from "./email";
import * as comments from "./handlers/commentHandlers";
import * as replies from "./handlers/replyHandlers";
import * as interst from "./handlers/interestHandlers";
import * as community from "./handlers/communityHandlers";

export const {
    createUserDocument,
    getUser,
    setUser,
    deleteUser
} = user;

export const { sendEmail } = email;

export const {
    createInterestHandler,
    updateInterestHandler,
    deleteInterestHandler,
    getPaginatedInterestsHandler,
    getPaginatedUserSpecificInterestsHandler,
    publishScheduledInterestsJobHandler
} = interst;

export const {
    createCommunityPostHandler,
    updateCommunityPostHandler,
    deleteCommunityPostHandler,
    getPaginatedCommunityPostsHandler,
    getPaginatedUserSpecificCommunityPostsHandler,
    publishScheduledCommunityPostsHandler
} = community;

export const {
    createCommentHandler,
    updateCommentHandler,
    deleteCommentHandler,
    getCommentsHandler,
    voteUpvoteCommentHandler
} = comments;

export const {
    createReplyHandler,
    updateReplyHandler,
    deleteReplyHandler,
    getRepliesHandler,
    voteUpvoteReplyHandler
} = replies;