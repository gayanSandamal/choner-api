/* eslint-disable */
import { General, GetResponse } from './CommentsReplies';

export interface Reply extends General {
    commentId: string;
    reply: string;
}

export interface GetRepliesResponse extends GetResponse {
    replies: Reply[];
}
