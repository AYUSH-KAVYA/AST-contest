import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

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

function cleanText(text) {
  if (!text) return text;
  // Remove "Based on ...:" or "Based on ... pattern "
  return text.replace(/^Based on [^:]*:\s*/i, '').trim();
}

async function cleanAllQuestions() {
  console.log('🧹 Stripping "Based on..." pattern prefixes from all questions...');

  // Clean question_bank
  const bankSnap = await getDocs(collection(db, 'question_bank'));
  for (const d of bankSnap.docs) {
    const data = d.data();
    const newText = cleanText(data.questionText);
    if (newText !== data.questionText) {
      await updateDoc(doc(db, 'question_bank', d.id), { questionText: newText });
      console.log(`Cleaned Bank Q: "${newText}"`);
    }
  }

  // Clean contests
  const contestSnap = await getDocs(collection(db, 'contests'));
  for (const d of contestSnap.docs) {
    const data = d.data();
    const questions = data.questions || [];
    let updated = false;
    const newQuestions = questions.map((q) => {
      const cleaned = cleanText(q.questionText);
      if (cleaned !== q.questionText) updated = true;
      return { ...q, questionText: cleaned };
    });

    if (updated) {
      await updateDoc(doc(db, 'contests', d.id), { questions: newQuestions });
      console.log(`Cleaned Contest: "${data.title}"`);
    }
  }

  console.log('✅ Successfully removed all "Based on..." text from all questions!');
  process.exit(0);
}

cleanAllQuestions().catch((err) => {
  console.error('Cleaning failed:', err);
  process.exit(1);
});
