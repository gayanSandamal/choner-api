/* eslint-disable */
import * as functions from "firebase-functions";
import admin from "./admin/firebaseAdmin";

interface Comment {
    id: string;
    postId: string;
    comment: string;
    createdBy: {
      uid: string;
      displayName: string;
      profileImageUrl: string;
    };
    createdAt: FirebaseFirestore.Timestamp;
}
  
const commentAndReplyCollection = 'communityPost';

export const createComment = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user ID from the authenticated context
        const uid = context.auth.uid;

        // Get the user document from Firestore
        const userDoc = await admin.firestore().collection('users').doc(uid).get();

        // Check if the user document exists
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found.');
        }
        const userData = userDoc.data();
        // Sanitize the user data to avoid exposing private information
        const createdBy = {
            uid,
            displayName: userData?.displayName,
            profileImageUrl: userData?.profileImageUrl
        };

        // Extract data from the request
        const { type = commentAndReplyCollection, postId, comment } = data;

        // Validate required fields
        if (!postId || !comment || !createdBy) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        // Create a new community comments document
        const communityCommentRef = admin.firestore().collection(`${type}Comments`).doc();

        const newCommunityComment = {
            postId,
            id: communityCommentRef.id,
            comment,
            createdBy,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        // Set the new interest post document in Firestore
        await communityCommentRef.set(newCommunityComment);

        // Fetch the saved document to get the resolved server timestamp
        const savedCommentDoc = await communityCommentRef.get();
        const savedCommentData = savedCommentDoc.data();

        // Extract the timestamp in seconds and nanoseconds
        const createdAtTimestamp = savedCommentData?.createdAt;
        const createdAt = {
            _seconds: createdAtTimestamp.seconds,
            _nanoseconds: createdAtTimestamp.nanoseconds
        };

        console.log(`Comment created with ID: ${communityCommentRef.id}`);

        // Return the created interest post data, along with safe user data
        return {
            data: {
                ...newCommunityComment,
                createdAt
            },
            message: `${type} comment has been created successfully`
        };
        
    } catch (error) {
        console.error('Error creating interest post:', error);
        // Improve the returned error message for better debugging
        throw error;
    }
});

export const updateComment = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user ID from the authenticated context
        const uid = context.auth.uid;

        // Extract data from the request
        const { type = commentAndReplyCollection, commentId, comment } = data;

        // Validate required fields
        if (!commentId || !comment) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        // Get the community comment document
        const communityCommentRef = admin.firestore().collection(`${type}Comments`).doc(commentId);
        const communityCommentGet = await communityCommentRef.get();
        const communityCommentData = communityCommentGet.data();

        if (!communityCommentData) {
            throw new functions.https.HttpsError('not-found', 'Comment not found.');
        }

        if (communityCommentData.createdBy.uid !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to update this comment.');
        }

        const updatedComment = {
            comment,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Update the comment document in Firestore
        await communityCommentRef.update(updatedComment);

        console.log(`Comment updated with ID: ${commentId}`);

        // Return the updated comment data
        return {
            data: { ...communityCommentData, ...updatedComment },
            message: `${type} comment has been updated successfully`
        };
    } catch (error) {
        console.error('Error updating comment:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while updating the comment.');
    }
});

export const deleteComment = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user ID from the authenticated context
        const uid = context.auth.uid;

        // Get the user document from Firestore
        const userDoc = await admin.firestore().collection('users').doc(uid).get();

        // Check if the user document exists
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found.');
        }
        const userData = userDoc.data();
        // Sanitize the user data to avoid exposing private information
        const deletedBy = {
            uid,
            displayName: userData?.displayName,
            profileImageUrl: userData?.profileImageUrl
        };

        // Extract data from the request
        const { type = commentAndReplyCollection, commentId } = data;

        // Validate required fields
        if (!commentId || !deletedBy) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        // Create a new community comments document
        const communityCommentRef = admin.firestore().collection(`${type}Comments`).doc(commentId);

        const communityComment = await communityCommentRef.get();
        if (communityComment.data()?.createdBy.uid !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to delete this comment.');
        }

        // Delete the comment document from Firestore
        await communityCommentRef.delete();

        console.log(`Comment deleted with ID: ${commentId}`);

        // Return the created interest post data, along with safe user data
        return {
            message: `${type} comment has been deleted successfully`
        };
        
    } catch (error) {
        console.error('Error deleting interest post:', error);
        // Improve the returned error message for better debugging
        throw error;
    }
});

export const getComments = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Extract data from the request
        const { type = commentAndReplyCollection, postId, pageSize = 10, lastVisible } = data;

        // Validate required fields
        if (!postId) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        // Create a reference to the comments collection
        const commentsRef = admin.firestore().collection(`${type}Comments`);

        // Start building the query
        let query = commentsRef
            .where('postId', '==', postId)
            .orderBy('createdAt', 'desc')
            .limit(pageSize);

        // If lastVisible is provided, use it for pagination
        if (lastVisible) {
            const lastVisibleDoc = await commentsRef.doc(lastVisible).get();
            if (lastVisibleDoc.exists) {
                query = query.startAfter(lastVisibleDoc);
            } else {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid lastVisible document ID.');
            }
        }

        // Execute the query
        const snapshot = await query.get();

        // Process the results
        const comments: Comment[] = [];
        snapshot.forEach((doc) => {
            comments.push({
                id: doc.id,
                ...(doc.data() as Omit<Comment, 'id'>)
            });
        });

        // Get the last visible document for next pagination
        const lastVisibleDocument = snapshot.docs[snapshot.docs.length - 1];

        return {
            comments,
            lastVisible: lastVisibleDocument ? lastVisibleDocument.id : null,
            hasMore: comments.length === pageSize
        };

    } catch (error) {
        console.error('Error fetching comments:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while fetching comments.');
    }
});

export const voteUpvoteComment = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user ID from the authenticated context
        const uid = context.auth.uid;

        // Get the user document from Firestore
        const userDoc = await admin.firestore().collection('users').doc(uid).get();

        // Check if the user document exists
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found.');
        }
        const userData = userDoc.data();
        // Sanitize the user data to avoid exposing private information
        const likedBy = {
            uid,
            displayName: userData?.displayName,
            profileImageUrl: userData?.profileImageUrl
        };

        // Extract data from the request
        const { type = commentAndReplyCollection, commentId } = data;

        // Validate required fields
        if (!commentId || !likedBy) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        // Create a new community comments document
        const communityCommentRef = admin.firestore().collection(`${type}Comments`).doc(commentId);

        const communityComment = await communityCommentRef.get();
        if (!communityComment.exists) {
            throw new functions.https.HttpsError('not-found', 'Comment not found.');
        }

        const commentData = communityComment.data();
        if (commentData?.likes?.includes(uid)) {
            const updatedComment = {
                likes: admin.firestore.FieldValue.arrayRemove(uid)
            };

            // Update the comment document in Firestore
            await communityCommentRef.update(updatedComment);

            console.log(`Comment unliked with ID: ${commentId}`);

            // Return the updated comment data
            return {
                data: { ...commentData, ...updatedComment },
                message: `${type} comment has been unliked successfully`
            };
        } else {
            const updatedComment = {
                likes: admin.firestore.FieldValue.arrayUnion(uid)
            };
    
            // Update the comment document in Firestore
            await communityCommentRef.update(updatedComment);
    
            console.log(`Comment liked with ID: ${commentId}`);
    
            // Return the updated comment data
            return {
                data: { ...commentData, ...updatedComment },
                message: `${type} comment has been liked successfully`
            };
        }
    } catch (error) {
        console.error('Error liking comment:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while liking the comment.');
    }
});

export const createReply = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user ID from the authenticated context
        const uid = context.auth.uid;

        // Get the user document from Firestore
        const userDoc = await admin.firestore().collection('users').doc(uid).get();

        // Check if the user document exists
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found.');
        }
        const userData = userDoc.data();
        // Sanitize the user data to avoid exposing private information
        const createdBy = {
            uid,
            displayName: userData?.displayName,
            profileImageUrl: userData?.profileImageUrl
        };

        // Extract data from the request
        const { type = commentAndReplyCollection, commentId, reply } = data;

        // Validate required fields
        if (!commentId || !reply || !createdBy) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        // Create a new community comments document
        const communityReplyRef = admin.firestore().collection(`${type}Replies`).doc();

        const newCommunityReply = {
            commentId,
            id: communityReplyRef.id,
            reply,
            createdBy,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        // Set the new interest post document in Firestore
        await communityReplyRef.set(newCommunityReply);

        // Fetch the saved document to get the resolved server timestamp
        const savedReplyDoc = await communityReplyRef.get();
        const savedReplyData = savedReplyDoc.data();

        // Extract the timestamp in seconds and nanoseconds
        const createdAtTimestamp = savedReplyData?.createdAt;
        const createdAt = {
            _seconds: createdAtTimestamp.seconds,
            _nanoseconds: createdAtTimestamp.nanoseconds
        };

        console.log(`Reply created with ID: ${communityReplyRef.id}`);

        // Return the created interest post data, along with safe user data
        return {
            data: {
                ...newCommunityReply,
                createdAt
            },
            message: `${type} reply has been created successfully`
        };
        
    } catch (error) {
        console.error('Error creating interest post:', error);
        // Improve the returned error message for better debugging
        throw error;
    }
});

export const updateReply = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user ID from the authenticated context
        const uid = context.auth.uid;

        // Extract data from the request
        const { type = commentAndReplyCollection, replyId, reply } = data;

        // Validate required fields
        if (!replyId || !reply) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        // Get the community comment document
        const communityReplyRef = admin.firestore().collection(`${type}Replies`).doc(replyId);
        const communityReplyGet = await communityReplyRef.get();
        const communityReplyData = communityReplyGet.data();

        if (!communityReplyData) {
            throw new functions.https.HttpsError('not-found', 'Reply not found.');
        }

        if (communityReplyData.createdBy.uid !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to update this reply.');
        }

        const updatedReply = {
            reply,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Update the comment document in Firestore
        await communityReplyRef.update(updatedReply);

        console.log(`Reply updated with ID: ${replyId}`);

        // Return the updated comment data
        return {
            data: { ...communityReplyData, ...updatedReply },
            message: `${type} reply has been updated successfully`
        };
    } catch (error) {
        console.error('Error updating reply:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while updating the reply.');
    }
});

export const deleteReply = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user ID from the authenticated context
        const uid = context.auth.uid;

        // Get the user document from Firestore
        const userDoc = await admin.firestore().collection('users').doc(uid).get();

        // Check if the user document exists
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found.');
        }
        const userData = userDoc.data();
        // Sanitize the user data to avoid exposing private information
        const deletedBy = {
            uid,
            displayName: userData?.displayName,
            profileImageUrl: userData?.profileImageUrl
        };

        // Extract data from the request
        const { type = commentAndReplyCollection, replyId } = data;

        // Validate required fields
        if (!replyId || !deletedBy) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        // Create a new community comments document
        const communityReplyRef = admin.firestore().collection(`${type}Replies`).doc(replyId);

        const communityReply = await communityReplyRef.get();
        if (communityReply.data()?.createdBy.uid !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to delete this reply.');
        }

        // Delete the comment document from Firestore
        await communityReplyRef.delete();

        console.log(`Reply deleted with ID: ${replyId}`);

        // Return the created interest post data, along with safe user data
        return {
            message: `${type} reply has been deleted successfully`
        };
        
    } catch (error) {
        console.error('Error deleting interest post:', error);
        // Improve the returned error message for better debugging
        throw error;
    }
});

export const getReplies = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Extract data from the request
        const { type = commentAndReplyCollection, commentId, pageSize = 10, lastVisible } = data;

        // Validate required fields
        if (!commentId) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        // Create a reference to the comments collection
        const repliesRef = admin.firestore().collection(`${type}Replies`);

        // Start building the query
        let query = repliesRef
            .where('commentId', '==', commentId)
            .orderBy('createdAt', 'desc')
            .limit(pageSize);

        // If lastVisible is provided, use it for pagination
        if (lastVisible) {
            const lastVisibleDoc = await repliesRef.doc(lastVisible).get();
            if (lastVisibleDoc.exists) {
                query = query.startAfter(lastVisibleDoc);
            } else {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid lastVisible document ID.');
            }
        }

        // Execute the query
        const snapshot = await query.get();

        // Process the results
        const replies: Comment[] = [];
        snapshot.forEach((doc) => {
            replies.push({
                id: doc.id,
                ...(doc.data() as Omit<Comment, 'id'>)
            });
        });

        // Get the last visible document for next pagination
        const lastVisibleDocument = snapshot.docs[snapshot.docs.length - 1];

        return {
            replies,
            lastVisible: lastVisibleDocument ? lastVisibleDocument.id : null,
            hasMore: replies.length === pageSize
        };

    } catch (error) {
        console.error('Error fetching replies:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while fetching replies.');
    }
});

export const voteUpvoteReply = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user ID from the authenticated context
        const uid = context.auth.uid;

        // Get the user document from Firestore
        const userDoc = await admin.firestore().collection('users').doc(uid).get();

        // Check if the user document exists
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found.');
        }
        const userData = userDoc.data();
        // Sanitize the user data to avoid exposing private information
        const likedBy = {
            uid,
            displayName: userData?.displayName,
            profileImageUrl: userData?.profileImageUrl
        };

        // Extract data from the request
        const { type = commentAndReplyCollection, replyId } = data;

        // Validate required fields
        if (!replyId || !likedBy) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        // Create a new community comments document
        const communityReplyRef = admin.firestore().collection(`${type}Replies`).doc(replyId);

        const communityReply = await communityReplyRef.get();
        if (!communityReply.exists) {
            throw new functions.https.HttpsError('not-found', 'Reply not found.');
        }

        const replyData = communityReply.data();
        if (replyData?.likes?.includes(uid)) {
            const updatedReply = {
                likes: admin.firestore.FieldValue.arrayRemove(uid)
            };

            // Update the comment document in Firestore
            await communityReplyRef.update(updatedReply);

            console.log(`Reply unliked with ID: ${replyId}`);

            // Return the updated comment data
            return {
                data: { ...replyData, ...updatedReply },
                message: `${type} reply has been unliked successfully`
            };
        } else {
            const updatedReply = {
                likes: admin.firestore.FieldValue.arrayUnion(uid)
            };
    
            // Update the comment document in Firestore
            await communityReplyRef.update(updatedReply);
    
            console.log(`Reply liked with ID: ${replyId}`);
    
            // Return the updated comment data
            return {
                data: { ...replyData, ...updatedReply },
                message: `${type} reply has been liked successfully`
            };
        }
    } catch (error) {
        console.error('Error liking reply:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while liking the reply.');
    }
});
