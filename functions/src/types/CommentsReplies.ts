/* eslint-disable */

import { Timestamp } from 'firebase-admin/firestore';
import { UserInfo } from './User';

export interface General {
    id: string;
    createdBy: UserInfo;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    likes?: string[];
}

export interface GetResponse {
    lastVisible: string | null;
    hasMore: boolean;
}

export interface ToggleVoteResponse {
    message: string;
}