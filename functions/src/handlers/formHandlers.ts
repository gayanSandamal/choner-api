import * as functions from 'firebase-functions';
import {createForm, deleteForm, getLatestForm, submitForm, updateForm} from '../services/formService';
import {CreatedForm, CreateForm, Form} from '../types/Form';
import {UserInfo} from '../types/User';
import {getAuthenticatedUser, getCreatedUserDTO} from '../utils/authUtils';
import {now} from '../utils/commonUtils';
import {updateUserDocument} from '../services/userService';
import {handleError} from '../utils/errorHandler';

// Create a new form
export const createFormHandler = functions.https.onCall(async (data, context) => {
  try {
    const {auth} = context;
    // Check if user is authenticated
    if (!auth) {
      throw new functions.https.HttpsError('unauthenticated', 'You must be authenticated to create a form');
    }
    const {title, questions, isFeedback} = data as CreateForm;
    // Check if data is valid
    if (!title || !questions || questions?.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Form data is invalid');
    }

    const user = await getAuthenticatedUser(context);
    const createdBy = getCreatedUserDTO(user);
    const createFormData = {
      title,
      questions,
      createdBy,
      isFeedback,
    } as any;

    const form = await createForm(createFormData);
    return {
      message: 'Form created successfully',
      data: form,
    };
  } catch (error) {
    return handleError(error);
  }
});

// Get latest form by collection
export const getLatestFormHandler = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'You must be authenticated to get a form');
    }
    const {isFeedback = true} = data;
    // Get latest form
    const form = await getLatestForm(isFeedback);
    return {
      message: 'Form retreived successfully',
      data: form,
    };
  } catch (error) {
    return handleError(error);
  }
});

// Update form by id
export const updateFormHandler = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'You must be authenticated to update a form');
    }
    const {id, title, formData} = data;
    // Check if data is valid
    if (!data || !id || !title || !formData) {
      throw new functions.https.HttpsError('invalid-argument', 'Form data is invalid');
    }
    // Update form
    const form = await updateForm(data.id, data.formData);
    return {
      message: 'Form updated successfully',
      data: form,
    };
  } catch (error) {
    return handleError(error);
  }
});

// Delete form by id
export const deleteFormHandler = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'You must be authenticated to delete a form');
    }
    const {id} = data;
    // Check if data is valid
    if (!data || !id) {
      throw new functions.https.HttpsError('invalid-argument', 'Form data is invalid');
    }
    // Delete form
    await deleteForm(data.id);
    return {
      message: 'Form deleted successfully',
    };
  } catch (error) {
    return handleError(error);
  }
});

// Form submittion
export const submitFormHandler = functions.https.onCall(async (data: Form & {isFeedback: boolean}, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'You must be authenticated to submit a form');
    }

    const user = await getAuthenticatedUser(context);

    const createdBy = getCreatedUserDTO(user) as unknown as UserInfo;

    const {id, title, pages, isFeedback} = data;
    // Check if data is valid
    if (!data || !id || !title || !pages || pages?.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Form data is invalid');
    }

    const formData = {
      id,
      title,
      questions: pages.map((page) => ({
        id: page.id,
        title: page.title,
        type: page.type,
        ...(page.options && {options: page.options}),
        value: page.value,
      })),
      createdBy,
      createdAt: now,
    };

    // Submit form
    const newSubmission = await submitForm(
      formData as unknown as CreatedForm,
      isFeedback
    );

    const formsSubmittedCollection = isFeedback ? 'feedbackFormSubmitted' : 'openingQuestionsFormSubmitted';
    const formsSubmitted = user[formsSubmittedCollection];
    if (formsSubmitted) {
      formsSubmitted.push({
        formId: newSubmission.formId,
        submittedFormId: newSubmission.submittedFormId,
        createdAt: newSubmission.createdAt,
      });
    } else {
      user[formsSubmittedCollection] = [{
        formId: newSubmission.formId,
        submittedFormId: newSubmission.submittedFormId,
        createdAt: newSubmission.createdAt,
      }];
    }

    await updateUserDocument(context?.auth?.uid, {[formsSubmittedCollection]: user[formsSubmittedCollection]});

    return {
      message: 'Form submitted successfully',
    };
  } catch (error) {
    return handleError(error);
  }
});

// Get user unsubmitted forms
// Call this function to get the latest form that the user has not submitted right after user signed up
export const getUserUnsubmittedFormsHandler = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'You must be authenticated to get unsubmitted forms');
    }

    const user = await getAuthenticatedUser(context);

    const {isFeedback} = data;

    const formsSubmittedCollection = isFeedback ? 'feedbackFormSubmitted' : 'openingQuestionsFormSubmitted';
    const formsSubmitted = user[formsSubmittedCollection] || [];

    const latestForm = await getLatestForm(isFeedback);

    if (!latestForm) {
      return {
        message: 'No forms found',
        data: [],
      };
    }

    const isFormSubmitted = formsSubmitted.find((form) => form.formId === latestForm.id);

    return {
      message: 'Unsubmitted forms retreived successfully',
      data: isFormSubmitted ? {status: 'submitted'} : [latestForm],
    };
  } catch (error) {
    return handleError(error);
  }
});
