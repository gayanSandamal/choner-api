/* eslint-disable */
import * as user from "./user";
import * as email from "./email";
import * as interest from "./interest";
import * as community from "./community";
import * as comments from "./comments";

export const {
    createUserDocument,
    getUser,
    setUser,
    deleteUser
} = user;

export const { sendEmail } = email;

export const {
    createInterest,
    publishScheduledInterestsJob,
    getInterest,
    getAllInterests,
    getPaginatedInterests,
    getPaginatedUserSpecificInterests,
    updateInterest,
    deleteInterest
} = interest;

export const {
    createCommunityPost,
    publishScheduledCommunityPostJob,
    getCommunityPost,
    getPaginatedCommunityPost,
    getPaginatedUserSpecificCommunityPosts,
    updateCommunityPost,
    deleteCommunityPost
} = community;

export const {
    createComment,
    updateComment,
    deleteComment,
    getComments,
    voteUpvoteComment
} = comments;