import {AuditRecord} from './Common';

export interface General extends AuditRecord {
    likes?: string[];
    deleted: false;
}

export interface ToggleVoteResponse {
    message: string;
}
