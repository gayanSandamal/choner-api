/* eslint-disable */
export interface UserInfo {
    uid: string;
    displayName: string;
    profileImageUrl: string;
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
