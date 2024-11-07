import {UserInfo} from './User';

export enum PostVisibilityStatus {
    Public = 'public',
    Scheduled = 'scheduled'
}

export type PostVisibilities = PostVisibilityStatus.Public | PostVisibilityStatus.Scheduled;

export interface Post {
    id: string;
    title: string;
    createdBy: UserInfo;
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt?: FirebaseFirestore.Timestamp;
    scheduledAt?: Date | FirebaseFirestore.Timestamp;
    visibility: PostVisibilities;
    votes: number;
    comments: string[];
}

export interface PaginatedResponse {
    lastVisible: string | null;
    hasMore: boolean;
}
