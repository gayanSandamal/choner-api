import {UserInfo} from './User';

export enum PostVisibilityStatus {
    Public = 'public',
    Scheduled = 'scheduled'
}

export type PostVisibilities = PostVisibilityStatus.Public | PostVisibilityStatus.Scheduled;

export interface Post {
    id: string;
    title: string;
    createdBy: string;
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt?: FirebaseFirestore.Timestamp;
    scheduledAt?: Date | FirebaseFirestore.Timestamp;
    visibility: PostVisibilities;
    votes: string[];
    comments: string[];
    createdUser: UserInfo;
}

export interface PaginatedResponse {
    lastVisible: string | null;
    hasMore: boolean;
}
