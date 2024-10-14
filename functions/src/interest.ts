/* eslint-disable */
import * as functions from "firebase-functions";
import admin from "./firebaseAdmin";

export const createInterest = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user ID from the authenticated context
        const uid = context.auth.uid;

        // Extract data from the request
        const { title, description, scheduledAt, visibility } = data;

        // Validate required fields
        if (!title || !description) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        // Create a new interest post document
        const interestPostRef = admin.firestore().collection('interests').doc();

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

        const newInterestPost = {
            createdBy: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            title,
            description: description || '',
            ...(scheduledAt && {scheduledAt: scheduledAt}),
            visibility: postVisibility,
            votes: [],
            comments: [],
            enrolments: [],
            createdUser
        };

        // Set the new interest post document in Firestore
        await interestPostRef.set(newInterestPost);

        console.log(`Interest post created with ID: ${interestPostRef.id}`);

        // Fetch the created document to return full data
        const createdPost = await interestPostRef.get();

        // Check if the document exists
        if (!createdPost.exists) {
            throw new functions.https.HttpsError('not-found', 'The newly created interest post was not found.');
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


export const updateInterest = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user ID from the authenticated context
        const uid = context.auth.uid;

        // Extract data from the request
        const { id, title, description, scheduledAt, visibility } = data;

        // Validate required fields
        if (!id || !title || !description) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
        }

        // Get the interest post document reference
        const interestPostRef = admin.firestore().collection('interests').doc(id);

        // Check if the document exists and if the user has permission to update it
        const doc = await interestPostRef.get();
        if (!doc.exists) {
            throw new functions.https.HttpsError('not-found', 'Interest post not found.');
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

        const updatedInterestPost = {
            title,
            description: description || '',
            scheduledAt: scheduledAt ? admin.firestore.Timestamp.fromDate(new Date(scheduledAt)) : docData.scheduledAt,
            visibility: postVisibility,
            updatedAt: nowTime
        };

        // Update the interest post document in Firestore
        await interestPostRef.update(updatedInterestPost);

        console.log(`Interest post updated with ID: ${id}`);

        // Return the updated interest post ID
        return { id, message: 'Interest post updated successfully' };

    } catch (error) {
        console.error('Error updating interest post:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while updating the interest post.');
    }
});

export const publishScheduledInterestsJob = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
    try {
        const now = admin.firestore.Timestamp.now();
        const currentDate = new Date(now.seconds * 1000 + now.nanoseconds / 1000000);

        const interestsRef = admin.firestore().collection('interests');

        // Query for interests that are scheduled and their scheduledAt time has passed
        const scheduledInterests = await interestsRef
            .where('visibility', '==', 'scheduled')
            .get();

        const batch = admin.firestore().batch();

        scheduledInterests.forEach((doc) => {
            const postData = doc.data();

            // Log the scheduledAt value and its type to debug the error
            console.log('ScheduledAt:', postData.scheduledAt, 'Type:', typeof postData.scheduledAt);

            let postTime;

            // Check if scheduledAt is a Firestore Timestamp
            if (postData.scheduledAt instanceof admin.firestore.Timestamp) {
                postTime = postData.scheduledAt.toDate();  // Convert Firestore Timestamp to JavaScript Date
            } else if (typeof postData.scheduledAt === 'string') {
                postTime = new Date(postData.scheduledAt);  // Convert ISO string to JavaScript Date
            } else if (postData.scheduledAt instanceof Date) {
                postTime = postData.scheduledAt;  // Already a JavaScript Date object
            } else {
                console.error('Unrecognized type for scheduledAt:', postData.scheduledAt);
                return;  // Skip this document if the type is unrecognized
            }

            console.log(currentDate.getTime(), postTime.getTime());
            

            // Compare current date with the postTime
            if (currentDate.getTime() >= postTime.getTime()) {
                batch.update(doc.ref, { visibility: 'public' });
            }
        });

        // Commit the batch
        await batch.commit();

        console.log(`Updated ${scheduledInterests.size} published scheduled interests`);

        return null;
    } catch (error) {
        console.error('Error updating scheduled interests:', error);
        return null;
    }
});

export const getAllInterests = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }
    
        // Get a reference to the collection
        const collectionRef = admin.firestore().collection('interests');
    
        // Fetch all documents from the collection
        const snapshot = await collectionRef.get();
    
        // Create an array to hold the document data
        const allDocs: any = [];
        snapshot.forEach((doc) => {
          allDocs.push({ id: doc.id, ...doc.data() });
        });
    
        // Return the data as JSON
        return allDocs;
      } catch (error) {
        console.error('Error getting interests data:', error);
        throw error;
      }
});

export const getPaginatedInterests = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to fetch public interests.');
        }

        // Extract pagination parameters from the request data
        const { pageSize = 10, lastVisible } = data;

        // Create a reference to the 'interests' collection
        const interestsRef = admin.firestore().collection('interests');

        // Start building the query
        let query = interestsRef
            .where('visibility', '==', 'public')
            .orderBy('createdAt', 'desc')
            .limit(pageSize);

        // If lastVisible is provided, use it for pagination
        if (lastVisible) {
            const lastVisibleDoc = await interestsRef.doc(lastVisible).get();
            if (lastVisibleDoc.exists) {
                query = query.startAfter(lastVisibleDoc);
            } else {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid lastVisible document ID.');
            }
        }

        // Execute the query
        const snapshot = await query.get();

        // Process the results
        const interests: any = [];
        snapshot.forEach((doc) => {
            interests.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Get the last visible document for next pagination
        const lastVisibleDocument = snapshot.docs[snapshot.docs.length - 1];

        return {
            interests,
            lastVisible: lastVisibleDocument ? lastVisibleDocument.id : null,
            hasMore: interests.length === pageSize
        };

    } catch (error) {
        console.error('Error fetching public interests:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while fetching public interests.');
    }
});

export const getPaginatedUserSpecificInterests = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to fetch public interests.');
        }

        // Extract pagination parameters from the request data
        const { uid, pageSize = 10, lastVisible } = data;

        // Create a reference to the 'interests' collection
        const interestsRef = admin.firestore().collection('interests');

        // Start building the query
        let query = interestsRef
            .where('visibility', '==', 'public')
            .where('createdBy', '==', uid)
            .orderBy('createdAt', 'desc')
            .limit(pageSize);

        // If lastVisible is provided, use it for pagination
        if (lastVisible) {
            const lastVisibleDoc = await interestsRef.doc(lastVisible).get();
            if (lastVisibleDoc.exists) {
                query = query.startAfter(lastVisibleDoc);
            } else {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid lastVisible document ID.');
            }
        }

        // Execute the query
        const snapshot = await query.get();

        // Process the results
        const interests: any = [];
        snapshot.forEach((doc) => {
            interests.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Get the last visible document for next pagination
        const lastVisibleDocument = snapshot.docs[snapshot.docs.length - 1];

        return {
            interests,
            lastVisible: lastVisibleDocument ? lastVisibleDocument.id : null,
            hasMore: interests.length === pageSize
        };

    } catch (error) {
        console.error('Error fetching public interests:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while fetching public interests.');
    }
});

export const getPaginatedUserSpecificScheduledInterests = functions.https.onCall(async (data, context) => {
    try {
        // Check if the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to fetch public interests.');
        }

        // Extract pagination parameters from the request data
        const { uid, pageSize = 10, lastVisible } = data;

        // Create a reference to the 'interests' collection
        const interestsRef = admin.firestore().collection('interests');

        // Start building the query
        let query = interestsRef
            .where('visibility', '==', 'scheduled')
            .where('createdBy', '==', uid)
            .orderBy('createdAt', 'desc')
            .limit(pageSize);

        // If lastVisible is provided, use it for pagination
        if (lastVisible) {
            const lastVisibleDoc = await interestsRef.doc(lastVisible).get();
            if (lastVisibleDoc.exists) {
                query = query.startAfter(lastVisibleDoc);
            } else {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid lastVisible document ID.');
            }
        }

        // Execute the query
        const snapshot = await query.get();

        // Process the results
        const interests: any = [];
        snapshot.forEach((doc) => {
            interests.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Get the last visible document for next pagination
        const lastVisibleDocument = snapshot.docs[snapshot.docs.length - 1];

        return {
            interests,
            lastVisible: lastVisibleDocument ? lastVisibleDocument.id : null,
            hasMore: interests.length === pageSize
        };

    } catch (error) {
        console.error('Error fetching public interests:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while fetching public interests.');
    }
});

export const deleteInterest = functions.https.onCall(async (data, context) => {
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
        const interestPostRef = admin.firestore().collection('interests').doc(id);

        // Check if the document exists and if the user has permission to delete it
        const doc = await interestPostRef.get();
        if (!doc.exists) {
            throw new functions.https.HttpsError('not-found', 'Interest post not found.');
        }
        const docData = doc.data();
        if (docData?.createdBy !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to delete this interest post.');
        }

        // Delete the interest post document from Firestore
        await interestPostRef.delete();

        console.log(`Interest post deleted with ID: ${id}`);

        // Return a success message
        return { message: 'Interest post deleted successfully' };

    } catch (error) {
        console.error('Error deleting interest post:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while deleting the interest post.');
    }
});

export const getInterest = functions.https.onCall(async (data, context) => {
    try {
        // Get the interest post ID from the request data
        const id = data.id;

        // Check if the interest is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Unauthenticated user.');
        }

        // Get the user document from Firestore
        const interestDoc = await admin.firestore().collection('interests').doc(id).get();

        // Check if the interest document exists
        if (!interestDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Interest not found.');
        }

        // Return the interest data
        return interestDoc.data();

    } catch (error) {
        console.error('Error getting interest data:', error);
        throw error;
    }
});