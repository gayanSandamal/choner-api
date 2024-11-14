import {UserFormSubmission} from './Form';

export interface UserInfo {
    uid: string;
    displayName: string;
    profileImageUrl: string;
    feedbackFormSubmitted?: UserFormSubmission[];
    openingQuestionsFormSubmitted?: UserFormSubmission[];
}

export interface UserDocument {
    uid: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
    profileImageUrl?: string;
    photoURL?: string;
    providerId?: string;
    phoneNumber?: string;
}

export interface UpdateUserResponse {
    message: string;
}
