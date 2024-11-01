/* eslint-disable */
import { General, GetResponse } from './CommentsReplies';

export interface Comment extends General {
    postId: string;
    comment: string;
}

export interface GetCommentsResponse extends GetResponse {
    comments: Comment[];
}
