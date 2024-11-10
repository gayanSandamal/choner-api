import {LocationField} from './Common';
import {PaginatedResponse, Post} from './Post';

export interface Interest extends Post {
    description: string;
    enrolments: string[];
    location: LocationField;
}

export interface GetPaginatedInterestsResponse extends PaginatedResponse {
    interests: Interest[];
}
