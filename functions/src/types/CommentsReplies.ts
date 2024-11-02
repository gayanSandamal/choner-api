/* eslint-disable */
import { AuditRecord } from './Common';

export interface General extends AuditRecord {
    likes?: string[];
}

export interface ToggleVoteResponse {
    message: string;
}