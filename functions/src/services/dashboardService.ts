import admin from '../admin/firebaseAdmin';
import {Dashboard} from '../types/Dashboard';
import {FormSubmissionField} from '../types/Form';
import {getRandomChallenge} from './challengesService';
import {getTotalInterestsCount} from './interestService';

const SUBMISSION_COLLECTION = 'submissions';

// Get dashboard data by user id
export const getDashboardData = async (userId: string): Promise<Dashboard | null> => {
  const submissionsRef = admin.firestore().collection(SUBMISSION_COLLECTION);

  const existingSubmissionsRefDoc = await submissionsRef
    .where('createdBy.uid', '==', userId)
    .where('isFeedback', '==', false)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  let motiveField: FormSubmissionField | null = null;

  if (!existingSubmissionsRefDoc.empty) {
    const submissionsData = existingSubmissionsRefDoc.docs[0].data();

    motiveField = submissionsData?.questions?.find(
      (question: FormSubmissionField): boolean => Boolean(question.isMotive)
    ) || null;
  }

  const randomTrendingChallenge = await getRandomChallenge();
  const similarInterestsCount = await getTotalInterestsCount();

  const dashboardData: Dashboard = {
    motive: motiveField?.value || null,
    randomTrendingChallenge: randomTrendingChallenge || null,
    similarInterestsCount: similarInterestsCount || 0,
  };

  return dashboardData;
};
