/* eslint-disable */
import { General } from './CommentsReplies';
import { PaginatedResponse } from './Post';

export interface Reply extends General {
    commentId: string;
    reply: string;
}

export interface GetRepliesResponse extends PaginatedResponse {
    replies: Reply[];
}
