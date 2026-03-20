import * as admin from 'firebase-admin';
import { initialize } from 'fireorm';
import * as dotenv from 'dotenv';
dotenv.config();
let serviceAccount;
try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
}
catch (e) {
    serviceAccount = {};
}
// @ts-ignore
if (admin.apps.length === 0) {
    admin.initializeApp({
        // @ts-ignore
        credential: admin.credential.cert(serviceAccount),
    });
}
const firestore = admin.firestore();
initialize(firestore);
export { firestore, admin };
