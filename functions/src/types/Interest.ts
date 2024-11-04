import {PaginatedResponse, Post} from "./Post";

export interface Interest extends Post {
    description: string;
    enrolments: string[];
}

export interface GetPaginatedInterestsResponse extends PaginatedResponse {
    interests: Interest[];
}
