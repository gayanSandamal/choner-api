import {UserInfo} from 'firebase-admin/auth';
import {LocationField} from './Common';
import {PaginatedResponse, Post} from './Post';

export enum EnrolmentStatus {
    ENROLLED = 'enrolled',
    NOT_ENROLLED = 'not-enrolled',
}

export type EnrolmentStatuses = EnrolmentStatus.ENROLLED | EnrolmentStatus.NOT_ENROLLED;

export interface Interest extends Post {
    description: string;
    enrolments?: UserInfo[];
    location: LocationField;
    enrolmentStatus: EnrolmentStatuses;
}

export interface GetPaginatedInterestsResponse extends PaginatedResponse {
    interests: Interest[];
}
