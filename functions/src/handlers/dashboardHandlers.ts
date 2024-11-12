import * as functions from 'firebase-functions';
import {getDashboardData} from '../services/dashboardService';

// Get dashboard data by user id
export const getDashboardDataHandler = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be authenticated to get dashboard data');
  }
  const {userId} = data;
  // Check if data is valid
  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'User ID is invalid');
  }
  // Get dashboard data
  const dashboardData = await getDashboardData(userId);
  return {
    message: 'Dashboard data retreived successfully',
    data: dashboardData,
  };
});
