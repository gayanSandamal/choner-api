/* eslint-disable */
import { AuditRecord } from './Common';

export interface General extends AuditRecord {
    likes?: string[];
}

export interface GetResponse {
    lastVisible: string | null;
    hasMore: boolean;
}

export interface ToggleVoteResponse {
    message: string;
}