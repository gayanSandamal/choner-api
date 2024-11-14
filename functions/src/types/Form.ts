import {UserInfo} from './User';


export enum FormFieldTypes {
    text = 'text',
    number = 'number',
    date = 'date',
    time = 'time',
    datetime = 'datetime',
    checkbox = 'checkbox',
    radio = 'radio',
    select = 'select',
    textarea = 'textarea'
}

export type FormFields = FormFieldTypes.text |
FormFieldTypes.number |
FormFieldTypes.date |
FormFieldTypes.time |
FormFieldTypes.datetime |
FormFieldTypes.checkbox |
FormFieldTypes.radio |
FormFieldTypes.select |
FormFieldTypes.textarea;

export type Option = {
    id: string;
    title: string;
    value?: number;
};

export type Page = {
    id: string;
    title: string;
    type: FormFieldTypes;
    options?: Option[];
    value?: string | number | boolean | Date;
};

export type Form = {
    id: string;
    title: string;
    pages: Page[];
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt?: FirebaseFirestore.Timestamp;
    isFeedback?: boolean;
};

export type Question = {
    id: string;
    title: string;
    type: FormFieldTypes;
    options?: Option[];
    placeholder?: string;
    info?: string;
    value?: string | number | boolean | Date;
    isMotive?: boolean;
};

export type CreateForm = {
    title: string;
    questions: Question[];
    isFeedback?: boolean;
    createdBy?: UserInfo;
};

export type CreatedForm = {
    id: string;
    title: string;
    questions: Question[];
    createdBy: UserInfo;
    createdAt: FirebaseFirestore.Timestamp;
    isFeedback?: boolean;
};

export type FormSubmissionField = {
    id: string;
    title: string;
    type: FormFieldTypes;
    value?: string | number | boolean | Date | null;
    scale?: number;
};

export type UserFormSubmission = {
    formId: string;
    submittedFormId?: string;
    createdAt: FirebaseFirestore.Timestamp;
};

export type FormSubmission = {
    questions: FormSubmissionField[];
    createdBy: UserInfo;
} & UserFormSubmission;
