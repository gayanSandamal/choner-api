import admin from '../admin/firebaseAdmin';
import {CreatedForm, CreateForm, Form, FormSubmissionField, Question, FormFieldTypes} from '../types/Form';
import {UserInfo} from '../types/User';
import {getCreatedUserDTO} from '../utils/authUtils';
import {now} from '../utils/commonUtils';
import {v4 as uuidv4} from 'uuid';

const FEEDBACK_COLLECTION = 'feedback';
const OPENING_QUESTIONS_COLLECTION = 'openingQuestions';
const FEEDBACK_SUBMISSION_COLLECTION = 'feedback';
const OPENING_QUESTIONS_SUBMISSION_COLLECTION = 'openingQuestions';

// Create a new form
export const createForm = async (formData: Omit<CreateForm, 'id'>): Promise<CreatedForm> => {
  const {title, questions, createdBy, isFeedback = true} = formData;
  const COLLECTION = isFeedback ? FEEDBACK_COLLECTION : OPENING_QUESTIONS_COLLECTION;
  const formRef = admin.firestore().collection(COLLECTION).doc();
  const questionsWithIds = questions.map((question: Question) => {
    return {
      ...question,
      id: uuidv4(),
      options: question.options?.map((option, index) => {
        const questionId = index + 1;
        return {
          ...option,
          id: questionId,
        };
      }),
    };
  });
  const newForm = {
    id: formRef.id,
    title,
    questions: questionsWithIds,
    createdBy,
    createdAt: now,
  };
  await formRef.set(newForm);
  return newForm as unknown as CreatedForm;
};

// Get latest form by collection
export const getLatestForm = async (isFeedback: boolean): Promise<Form | null> => {
  const COLLECTION = isFeedback ? FEEDBACK_COLLECTION : OPENING_QUESTIONS_COLLECTION;
  const querySnapshot = await admin.firestore().collection(COLLECTION).orderBy('createdAt', 'desc').limit(1).get();
  if (querySnapshot.empty) {
    return null;
  }
  return querySnapshot.docs[0].data() as Form;
};

// Update form by id
export const updateForm = async (id: string, formData: Partial<CreateForm>, isFeedback = true): Promise<CreatedForm | null> => {
  const COLLECTION = isFeedback ? FEEDBACK_COLLECTION : OPENING_QUESTIONS_COLLECTION;
  const formRef = admin.firestore().collection(COLLECTION).doc(id);
  const formSnapshot = await formRef.get();
  if (!formSnapshot.exists) {
    return null;
  }
  await formRef.update(formData);
  return {...formSnapshot.data() as CreatedForm, ...formData};
};

// Delete form by id
export const deleteForm = async (id: string, isFeedback = true): Promise<void> => {
  const COLLECTION = isFeedback ? FEEDBACK_COLLECTION : OPENING_QUESTIONS_COLLECTION;
  const formRef = admin.firestore().collection(COLLECTION).doc(id);
  await formRef.delete();
};

// Form submittion
export const submitForm = async (
  form: CreatedForm,
  isFeedback = true,
  auth: UserInfo
): Promise<void> => {
  const {id, questions} = form;
  const COLLECTION = isFeedback ? FEEDBACK_SUBMISSION_COLLECTION : OPENING_QUESTIONS_SUBMISSION_COLLECTION;
  const formRef = admin.firestore().collection(COLLECTION).doc(id);
  const formSnapshot = await formRef.get();
  if (!formSnapshot.exists) {
    throw new Error('Form not found');
  }
  const now = admin.firestore.Timestamp.now();
  const createdBy = getCreatedUserDTO(auth);

  const formattedQuestions = questions.map((question: Question): FormSubmissionField => {
    const {id, title, type, options, value} = question;
    return {
      id,
      title,
      type,
      value,
      ...(options && (type === FormFieldTypes.radio) && {scale: options.length}),
    };
  });
  const submission = {
    formId: id,
    data: formattedQuestions,
    createdAt: now,
    createdBy,
  };
  await formRef.collection('submissions').doc().set(submission);
};