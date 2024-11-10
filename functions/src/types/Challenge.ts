import {LocationField} from './Common';
import {PaginatedResponse} from './Post';
import {UserInfo} from './User';

export enum ChallengeState {
    SCHEDULED = 'scheduled',
    ONGOING = 'ongoing',
    ENDED = 'ended'
}

type ChallengeStates = ChallengeState.SCHEDULED | ChallengeState.ONGOING | ChallengeState.ENDED

export enum UserChallengeStatus {
    NOT_JOINED = 'not-joined',
    PENDING_REQUEST = 'pending-request',
    JOINED = 'joined',
    COMPLETED = 'completed',
    NOT_COMPLETED = 'not-completed',
    COMPLETE_CONFIRMED = 'complete-confirmed'
}

type UserChallengeStatuses = UserChallengeStatus.NOT_JOINED |
    UserChallengeStatus.PENDING_REQUEST |
    UserChallengeStatus.JOINED |
    UserChallengeStatus.COMPLETED |
    UserChallengeStatus.NOT_COMPLETED |
    UserChallengeStatus.COMPLETE_CONFIRMED

export enum ChallengeType {
    VIRTUAL = 'virtual',
    ON_LOCATION = 'on-location'
}

type ChallengeTypes = ChallengeType.VIRTUAL | ChallengeType.ON_LOCATION

export interface Participant extends UserInfo {
    participantStatus: UserChallengeStatuses;
}

export interface Challenge {
    id: string;
    description: string;
    type: ChallengeTypes;
    challengeState: ChallengeStates;
    location: LocationField;
    challengeAt?: FirebaseFirestore.Timestamp;
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt?: FirebaseFirestore.Timestamp;
    createdBy: UserInfo;
    joinAnyone: boolean;
    participantStatus: UserChallengeStatuses;
    participationRangeId: number;
    participantLimitReached: boolean;
    participants?: Participant[];
    participantsToBBeJoined?: Participant[];
    deleted: boolean,
    approvedByCreator?: boolean
}

export interface GetPaginatedChallengesResponse extends PaginatedResponse {
    challenges: Challenge[];
}

export type ParticipantRange = {
    label: string;
    value: number;
}
