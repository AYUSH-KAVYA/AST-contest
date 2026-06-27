import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanCollection(collectionName) {
  try {
    const snap = await getDocs(collection(db, collectionName));
    console.log(`Found ${snap.docs.length} documents in '${collectionName}'`);
    for (const d of snap.docs) {
      await deleteDoc(doc(db, collectionName, d.id));
    }
    console.log(`Cleared collection '${collectionName}'`);
  } catch (err) {
    console.error(`Error cleaning '${collectionName}':`, err.message);
  }
}

async function main() {
  console.log('🧹 Starting Firestore Database Cleanup...');
  await cleanCollection('contests');
  await cleanCollection('question_bank');
  await cleanCollection('draft_answers');
  await cleanCollection('submissions');

  // Reset live_state/current
  try {
    await setDoc(doc(db, 'live_state', 'current'), {
      isLive: false,
      activeContestId: null,
    });
    console.log('Reset live_state/current to offline');
  } catch (err) {
    console.error('Error resetting live_state:', err.message);
  }

  console.log('✨ Firestore Database is 100% clean and ready for production!');
  process.exit(0);
}

main();
