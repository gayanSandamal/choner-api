/* eslint-disable */
import * as admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp();
    admin.firestore().settings({ignoreUndefinedProperties:true});
}

export default admin;
