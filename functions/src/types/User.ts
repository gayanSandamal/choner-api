export interface UserInfo {
    uid: string;
    displayName: string;
    profileImageUrl: string;
    feedbackFormSubmitted?: string[];
    openingQuestionsFormSubmitted?: string[];
}

export interface UserDocument {
    uid: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
    profileImageUrl?: string;
}

export interface UpdateUserResponse {
    message: string;
}
