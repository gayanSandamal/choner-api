import admin from '../admin/firebaseAdmin';
import {Dashboard} from '../types/Dashboard';
import {getRandomChallenge} from './challengesService';
import {getTotalInterestsCount} from './interestService';

const DASHBOARD_COLLECTION = 'dashboard';

// Get dashboard data by user id
export const getDashboardData = async (userId: string): Promise<Dashboard | null> => {
  const dashboardRef = await admin.firestore().collection(DASHBOARD_COLLECTION).limit(1);
  const existingDashboardDoc = await dashboardRef.where('createdBy.uid', '==', userId).get();
  if (existingDashboardDoc.empty) {
    return null;
  }
  const dashboardData = existingDashboardDoc.docs[0].data();
  const motive = dashboardData.questions.find((question: any) => Boolean(question.isMotive));

  const randomTrendingChallenge = await getRandomChallenge();
  const similarInterestsCount = await getTotalInterestsCount();
  return {
    motive,
    randomTrendingChallenge,
    similarInterestsCount,
  };
};
