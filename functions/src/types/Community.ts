/* eslint-disable */
import { Post } from './Post';

export enum CommunityPostType {
    Post = 'post',
    Question = 'question'
}

export interface CommunityPost extends Post {
    imageUrls?: string[];
    type: CommunityPostType.Post | CommunityPostType.Question;
}

export interface GetPaginatedCommunityPostsResponse {
    communityPosts: CommunityPost[];
    lastVisible: string | null;
    hasMore: boolean;
}

export interface CommunityPostResponse {
    id: string;
    data: CommunityPost;
    message: string;
}
