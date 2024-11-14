import * as functions from 'firebase-functions';
import {getDashboardData} from '../services/dashboardService';
import {handleError} from '../utils/errorHandler';

// Get dashboard data by user id
export const getDashboardDataHandler = functions.https.onCall(async (_data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'You must be authenticated to get dashboard data');
    }
    // Check if data is valid
    if (!context.auth.uid) {
      throw new functions.https.HttpsError('invalid-argument', 'User ID is invalid');
    }
    // Get dashboard data
    const dashboardData = await getDashboardData(context.auth.uid);

    return {
      message: 'Dashboard data retrieved successfully',
      data: dashboardData,
    };
  } catch (error) {
    return handleError(error);
  }
});
