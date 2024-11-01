/* eslint-disable */

import { UserInfo } from "./User";

export enum PostVisibilityStatus {
    Public = 'public',
    Scheduled = 'scheduled'
}

export type PostVisibility = PostVisibilityStatus.Public | PostVisibilityStatus.Scheduled;

export interface Post {
    id: string;
    title: string;
    createdBy: string;
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt?: FirebaseFirestore.Timestamp;
    scheduledAt?: Date | FirebaseFirestore.Timestamp;
    visibility: PostVisibility;
    votes: string[];
    comments: string[];
    createdUser: UserInfo;
}