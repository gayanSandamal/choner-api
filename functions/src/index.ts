/* eslint-disable */
import * as user from "./user";
import * as email from "./email";
import * as interest from "./interest";

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
    updateInterest,
    deleteInterest
} = interest;