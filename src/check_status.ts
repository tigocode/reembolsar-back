import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function check() {
  const snapshot = await db.collection('requests').get();
  console.log(`Total requests: ${snapshot.size}`);
  snapshot.forEach(doc => {
    const d = doc.data();
    console.log(`ID: ${doc.id} | Status: ${d.status} | Title: ${d.title} | User: ${d.user || d.userId}`);
  });
}

check();
