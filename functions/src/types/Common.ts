/* eslint-disable */

import { Timestamp } from "firebase-admin/firestore";
import { UserInfo } from "./User";

interface Record {
    id: string;
}

export interface AuditRecord extends Record {
    createdBy: UserInfo;
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt?: Timestamp;
}
