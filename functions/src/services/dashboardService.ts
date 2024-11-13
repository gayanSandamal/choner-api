import admin from '../admin/firebaseAdmin';
import {Dashboard} from '../types/Dashboard';
import {getRandomChallenge} from './challengesService';
import {getTotalInterestsCount} from './interestService';

const OPENING_QUESTIONS_SUBMISSION_COLLECTION = 'submissionOpeningQuestions';

// Get dashboard data by user id
export const getDashboardData = async (userId: string): Promise<Dashboard | null> => {
  const submissionsRef = await admin.firestore().collection(OPENING_QUESTIONS_SUBMISSION_COLLECTION).limit(1);
  const existingSubmissionsRefDoc = await submissionsRef.where('createdBy.uid', '==', userId).get();
  if (existingSubmissionsRefDoc.empty) {
    return null;
  }
  const submissionsData = existingSubmissionsRefDoc.docs[0].data();
  const motive = submissionsData.questions.find((question: any) => Boolean(question.isMotive));

  const randomTrendingChallenge = await getRandomChallenge();
  const similarInterestsCount = await getTotalInterestsCount();
  const dashboardData: Dashboard = {
    motive: motive?.value || null,
    randomTrendingChallenge: randomTrendingChallenge || null,
    similarInterestsCount: similarInterestsCount || 0,
  };
  console.log('Dashboard data:', dashboardData);
  return dashboardData;
};
