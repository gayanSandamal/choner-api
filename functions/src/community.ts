/* eslint-disable */
import * as functions from "firebase-functions";
import admin from "./admin/firebaseAdmin";

export const createCommunityPost = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user ID from the authenticated context
        const uid = context.auth.uid;

        // Extract data from the request
        const { title, imageUrls, type = 'post', scheduledAt, visibility } = data;

        // Validate required fields
        if (!title) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        // Create a new interest post document
        const communityPostRef = admin.firestore().collection('community').doc();

        const postVisibility = scheduledAt ? 'scheduled' : visibility || 'public';

        // Get the user document from Firestore
        const userDoc = await admin.firestore().collection('users').doc(uid).get();

        // Check if the user document exists
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found.');
        }

        const userData = userDoc.data();
        // Sanitize the user data to avoid exposing private information
        const createdUser = {
            uid,
            displayName: userData?.displayName,
            profileImageUrl: userData?.profileImageUrl
        };

        const newCommunityPost = {
            createdBy: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            title,
            ...(imageUrls && {imageUrls: imageUrls}),
            type,
            ...(scheduledAt && {scheduledAt: new Date(scheduledAt)}),
            visibility: postVisibility,
            votes: [],
            comments: [],
            createdUser
        };

        // Set the new interest post document in Firestore
        await communityPostRef.set(newCommunityPost);

        console.log(`Community post created with ID: ${communityPostRef.id}`);

        // Fetch the created document to return full data
        const createdPost = await communityPostRef.get();

        // Check if the document exists
        if (!createdPost.exists) {
            throw new functions.https.HttpsError('not-found', 'The newly created community post was not found.');
        }

        const postData = createdPost.data();

        // Return the created interest post data, along with safe user data
        return {
            id: createdPost.id,
            data: { ...postData, createdUser },
            message: 'Interest post created successfully'
        };

    } catch (error) {
        console.error('Error creating interest post:', error);
        // Improve the returned error message for better debugging
        throw error;
    }
});


export const updateCommunityPost = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user ID from the authenticated context
        const uid = context.auth.uid;

        // Extract data from the request
        const { id, title, imageUrls, type = 'post', scheduledAt, visibility } = data;

        // Validate required fields
        if (!id || !title) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        // Get the interest post document reference
        const communitytPostRef = admin.firestore().collection('community').doc(id);

        // Check if the document exists and if the user has permission to update it
        const doc = await communitytPostRef.get();
        if (!doc.exists) {
            throw new functions.https.HttpsError('not-found', 'Community post not found.');
        }

        const docData = doc.data();
        if (!docData || docData.createdBy !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to update this interest post.');
        }

        if (docData.visibility === 'public') {
            throw new functions.https.HttpsError('permission-denied', 'You cannot update a published interest post. Only delete');
        }

        const nowTime = admin.firestore.FieldValue.serverTimestamp();

        const postVisibility = scheduledAt ? 'scheduled' : visibility || docData.visibility;

        const updatedCommunityPost = {
            ...docData,
            title,
            type,
            ...(imageUrls && {imageUrls: imageUrls}),
            scheduledAt: scheduledAt ? admin.firestore.Timestamp.fromDate(new Date(scheduledAt)) : docData.scheduledAt,
            visibility: postVisibility,
            updatedAt: nowTime
        };

        // Update the interest post document in Firestore
        await communitytPostRef.update(updatedCommunityPost);

        console.log(`Community post updated with ID: ${id}`);

        // Return the created interest post data, along with safe user data
        return {
            id: id,
            data: { ...updatedCommunityPost },
            message: 'Interest post updated successfully'
        };

    } catch (error) {
        console.error('Error updating community post:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while updating the community post.');
    }
});

export const publishScheduledCommunityPostJob = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
    try {
        const now = admin.firestore.Timestamp.now();
        const interestsRef = admin.firestore().collection('community');

        // Query for interests that are scheduled and their scheduledAt time has passed
        const scheduledInterests = await interestsRef
            .where('visibility', '==', 'scheduled')
            .where('scheduledAt', '<=', now)
            .get();

        const batch = admin.firestore().batch();

        scheduledInterests.forEach((doc) => {
            batch.update(doc.ref, { visibility: 'public' });
        });

        // Commit the batch
        await batch.commit();

        console.log(`Updated ${scheduledInterests.size} published scheduled community post`);

        return null;
    } catch (error) {
        console.error('Error updating scheduled community post:', error);
        return null;
    }
});

export const getPaginatedCommunityPost = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to fetch public interests.');
        }

        // Extract pagination parameters from the request data
        const { type = 'post', pageSize = 10, lastVisible } = data;

        // Create a reference to the 'interests' collection
        const communityPostRef = admin.firestore().collection('community');

        // Start building the query
        let query = communityPostRef
            .where('visibility', '==', 'public')
            .where('type', '==', type)
            .orderBy('createdAt', 'desc')
            .limit(pageSize);

        // If lastVisible is provided, use it for pagination
        if (lastVisible) {
            const lastVisibleDoc = await communityPostRef.doc(lastVisible).get();
            if (lastVisibleDoc.exists) {
                query = query.startAfter(lastVisibleDoc);
            } else {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid lastVisible document ID.');
            }
        }

        // Execute the query
        const snapshot = await query.get();

        // Process the results
        const communityPosts: any = [];
        snapshot.forEach((doc) => {
            communityPosts.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Get the last visible document for next pagination
        const lastVisibleDocument = snapshot.docs[snapshot.docs.length - 1];

        return {
            communityPosts,
            lastVisible: lastVisibleDocument ? lastVisibleDocument.id : null,
            hasMore: communityPosts.length === pageSize
        };

    } catch (error) {
        console.error('Error fetching public community posts:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while fetching public community posts.');
    }
});

export const getPaginatedUserSpecificCommunityPosts = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to fetch public interests.');
        }

        // Extract pagination parameters from the request data
        const { uid, type = 'post', pageSize = 10, lastVisible, visibility = 'public' } = data;

        // Create a reference to the 'interests' collection
        const communityPostsRef = admin.firestore().collection('community');

        // Start building the query
        let query = communityPostsRef
            .where('visibility', '==', visibility)
            .where('type', '==', type)
            .where('createdBy', '==', uid)
            .orderBy('createdAt', 'desc')
            .limit(pageSize);

        // If lastVisible is provided, use it for pagination
        if (lastVisible) {
            const lastVisibleDoc = await communityPostsRef.doc(lastVisible).get();
            if (lastVisibleDoc.exists) {
                query = query.startAfter(lastVisibleDoc);
            } else {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid lastVisible document ID.');
            }
        }

        // Execute the query
        const snapshot = await query.get();

        // Process the results
        const communityPosts: any = [];
        snapshot.forEach((doc) => {
            communityPosts.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Get the last visible document for next pagination
        const lastVisibleDocument = snapshot.docs[snapshot.docs.length - 1];

        return {
            communityPosts,
            lastVisible: lastVisibleDocument ? lastVisibleDocument.id : null,
            hasMore: communityPosts.length === pageSize
        };

    } catch (error) {
        console.error('Error fetching public community posts:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while fetching public community posts.');
    }
});

export const deleteCommunityPost = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user ID from the authenticated context
        const uid = context.auth.uid;

        // Extract interest ID from the request data
        const { id } = data;

        // Validate required field
        if (!id) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing interest ID.');
        }

        // Get the interest post document reference
        const communityPostRef = admin.firestore().collection('community').doc(id);

        // Check if the document exists and if the user has permission to delete it
        const doc = await communityPostRef.get();
        if (!doc.exists) {
            throw new functions.https.HttpsError('not-found', 'Community post not found.');
        }
        const docData = doc.data();
        if (docData?.createdBy !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to delete this community post.');
        }

        // Delete the interest post document from Firestore
        await communityPostRef.delete();

        console.log(`Community post deleted with ID: ${id}`);

        // Return a success message
        return { message: 'Community post deleted successfully' };

    } catch (error) {
        console.error('Error deleting community post:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while deleting the community post.');
    }
});

export const getCommunityPost = functions.https.onCall(async (data, context) => {
    try {
        // Get the interest post ID from the request data
        const id = data.id;

        // Check if the interest is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user document from Firestore
        const communityPostDoc = await admin.firestore().collection('community').doc(id).get();

        // Check if the interest document exists
        if (!communityPostDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Community not found.');
        }

        // Return the interest data
        return communityPostDoc.data();

    } catch (error) {
        console.error('Error getting community data:', error);
        throw error;
    }
});