/* eslint-disable */
import { Post } from './Post';

export interface Interest extends Post {
    description: string;
    enrolments: string[];
}

export interface GetPaginatedInterestsResponse {
    interests: Interest[];
    lastVisible: string | null;
    hasMore: boolean;
}
