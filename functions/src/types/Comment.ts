import {General} from './CommentsReplies';
import {PaginatedResponse} from './Post';

export interface Comment extends General {
    postId: string;
    comment: string;
}

export interface GetPaginatedCommentsResponse extends PaginatedResponse {
    comments: Comment[];
}
