/* eslint-disable */
import admin from '../admin/firebaseAdmin';
import { CommunityPost, CommunityPostTypes, GetPaginatedCommunityPostsResponse } from '../types/Community';
import { PostVisibilities, PostVisibilityStatus } from '../types/Post';

const COMMUNITY_COLLECTION = "community";

export const createCommunityPost = async (postData: Omit<CommunityPost, "id">): Promise<CommunityPost> => {
  const postRef = admin.firestore().collection(COMMUNITY_COLLECTION).doc();
  const newPost: CommunityPost = {...postData, id: postRef.id};
  await postRef.set(newPost);
  return newPost;
};

export const updateCommunityPost = async (
  postId: string,
  updatedData: Partial<CommunityPost>
): Promise<FirebaseFirestore.DocumentSnapshot<CommunityPost>> => {
  const postRef = admin.firestore().collection(COMMUNITY_COLLECTION).doc(postId);
  await postRef.update(updatedData);
  return postRef.get() as unknown as FirebaseFirestore.DocumentSnapshot<CommunityPost>;
};

export const deleteCommunityPost = async (postId: string): Promise<void> => {
  const postRef = admin.firestore().collection(COMMUNITY_COLLECTION).doc(postId);
  await postRef.delete();
};

export const getCommunityPost = async (postId: string): Promise<CommunityPost | null> => {
  const postDoc = await admin.firestore().collection(COMMUNITY_COLLECTION).doc(postId).get();
  return postDoc.exists ? (postDoc.data() as CommunityPost) : null;
};

export const getPaginatedCommunityPosts = async (
  type: CommunityPostTypes,
  pageSize: number,
  lastVisible: string | undefined,
  visibility: PostVisibilities = PostVisibilityStatus.Public
): Promise<GetPaginatedCommunityPostsResponse> => {
  let query = admin.firestore()
    .collection(COMMUNITY_COLLECTION)
    .where("visibility", "==", visibility)
    .where("type", "==", type)
    .where("deleted", "==", false)
    .orderBy("createdAt", "desc")
    .limit(pageSize);

  if (lastVisible) {
    const lastVisibleDoc = await admin.firestore().collection(COMMUNITY_COLLECTION).doc(lastVisible).get();
    if (lastVisibleDoc.exists) {
      query = query.startAfter(lastVisibleDoc);
    } else {
      throw new Error("Invalid lastVisible document ID.");
    }
  }

  const snapshot = await query.get();
  const communityPosts: CommunityPost[] = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()} as CommunityPost));

  return {
    communityPosts,
    lastVisible: snapshot.docs[snapshot.docs.length - 1]?.id || null,
    hasMore: communityPosts.length === pageSize,
  };
};

export const getPaginatedUserSpecificCommunityPosts = async (
  uid: string,
  type: CommunityPostTypes,
  pageSize: number,
  lastVisible: string | undefined,
  visibility: PostVisibilities = PostVisibilityStatus.Public
): Promise<GetPaginatedCommunityPostsResponse> => {
  let query = admin.firestore()
    .collection(COMMUNITY_COLLECTION)
    .where("createdBy.uid", "==", uid)
    .where("visibility", "==", visibility)
    .where("type", "==", type)
    .where("deleted", "==", false)
    .orderBy("createdAt", "desc")
    .limit(pageSize);

  if (lastVisible) {
    const lastVisibleDoc = await admin.firestore().collection(COMMUNITY_COLLECTION).doc(lastVisible).get();
    if (lastVisibleDoc.exists) {
      query = query.startAfter(lastVisibleDoc);
    } else {
      throw new Error("Invalid lastVisible document ID.");
    }
  }

  const snapshot = await query.get();
  const communityPosts: CommunityPost[] = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()} as CommunityPost));

  return {
    communityPosts,
    lastVisible: snapshot.docs[snapshot.docs.length - 1]?.id || null,
    hasMore: communityPosts.length === pageSize,
  };
};

export const publishScheduledCommunityPosts = async (): Promise<number> => {
  const communityRef = admin.firestore().collection(COMMUNITY_COLLECTION);

    const scheduledPosts = await communityRef
        .where('visibility', '==', 'scheduled')
        .where('scheduledAt', '<=', admin.firestore.Timestamp.now())
        .where('deleted', '==', false)
        .get();

  const batch = admin.firestore().batch();

  scheduledPosts.forEach((doc) => {
    batch.update(doc.ref, {visibility: "public"});
  });

  await batch.commit();
  return scheduledPosts.size || 0;
};
