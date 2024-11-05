import {PaginatedResponse, Post} from './Post';

export enum CommunityPostType {
    Post = 'post',
    Question = 'question'
}

export type CommunityPostTypes = CommunityPostType.Post | CommunityPostType.Question;

export interface CommunityPost extends Post {
    imageUrls?: string[];
    type: CommunityPostType.Post | CommunityPostType.Question;
}

export interface GetPaginatedCommunityPostsResponse extends PaginatedResponse {
    communityPosts: CommunityPost[];
}

export interface CommunityPostResponse {
    id: string;
    data: CommunityPost;
    message: string;
}
