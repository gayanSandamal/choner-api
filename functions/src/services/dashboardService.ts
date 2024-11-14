import admin from '../admin/firebaseAdmin';
import {Dashboard} from '../types/Dashboard';
import {getRandomChallenge} from './challengesService';
import {getTotalInterestsCount} from './interestService';

const SUBMISSION_COLLECTION = 'submissions';

// Get dashboard data by user id
export const getDashboardData = async (userId: string): Promise<Dashboard | null> => {
  console.log('Getting dashboard data for user:', userId);

  admin.firestore().collection(SUBMISSION_COLLECTION);
  const submissionsRef = admin.firestore().collection(SUBMISSION_COLLECTION);
  const existingSubmissionsRefDoc = await submissionsRef
    .where('createdBy.uid', '==', userId)
    .where('isFeedback', '==', false)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();
  if (existingSubmissionsRefDoc.empty) {
    return null;
  }
  const submissionsData = existingSubmissionsRefDoc.docs[0].data();
  const motive = submissionsData?.questions?.find((question: any) => Boolean(question.isMotive)) || null;
  console.log('Motive:', motive);

  const randomTrendingChallenge = await getRandomChallenge();
  console.log('Random trending challenge:', JSON.stringify(randomTrendingChallenge));

  const similarInterestsCount = await getTotalInterestsCount();
  console.log('Similar interests count:', JSON.stringify(similarInterestsCount));

  const dashboardData: Dashboard = {
    motive: motive?.value || null,
    randomTrendingChallenge: randomTrendingChallenge || null,
    similarInterestsCount: similarInterestsCount || 0,
  };
  console.log('Dashboard data:', dashboardData);
  return dashboardData;
};
