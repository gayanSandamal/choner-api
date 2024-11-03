/* eslint-disable */
import { General } from './CommentsReplies';
import { PaginatedResponse } from './Post';

export interface Comment extends General {
    postId: string;
    comment: string;
}

export interface GetCommentsResponse extends PaginatedResponse {
    comments: Comment[];
}
