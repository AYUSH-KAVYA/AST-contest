import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
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

const questionsData = [
  {
    questionText: 'Based on the "Uncountable Noun" pattern: The tourist asked for some informations about the local museum from the guide.',
    options: ['The tourist asked for', 'some informations', 'about the local museum', 'from the guide'],
    correctOptionIndex: 1, // B
  },
  {
    questionText: 'Based on the "One of the" pattern: Ravi is considered to be one of the best student in our entire school.',
    options: ['Ravi is considered to be', 'one of the best student', 'in our', 'entire school'],
    correctOptionIndex: 1, // B
  },
  {
    questionText: 'Based on the "Uncountable Noun" pattern: She went to the mall and bought beautiful furnitures for her new apartment.',
    options: ['She went to the mall', 'and bought', 'beautiful furnitures', 'for her new apartment'],
    correctOptionIndex: 2, // C
  },
  {
    questionText: 'Based on the "Quantifier Mismatch" pattern: The chef accidentally added too many salt to the soup, making it bitter.',
    options: ['The chef accidentally added', 'too many salt', 'to the soup', 'making it bitter'],
    correctOptionIndex: 1, // B
  },
  {
    questionText: 'Based on the "One of the" pattern: One of my closest friend is going to London tomorrow.',
    options: ['One of my', 'closest friend is', 'going to', 'London tomorrow'],
    correctOptionIndex: 1, // B
  },
  {
    questionText: 'Based on Irregular Plural Nouns: The old farmer has a large flock of sheeps grazing in the green field.',
    options: ['The old farmer', 'has a large flock of', 'sheeps grazing', 'in the green field'],
    correctOptionIndex: 2, // C
  },
  {
    questionText: 'Based on Compound Nouns: All my sister-in-laws are coming to visit us this weekend.',
    options: ['All my', 'sister-in-laws', 'are coming', 'to visit us this weekend'],
    correctOptionIndex: 1, // B
  },
  {
    questionText: 'Based on Nouns that look Plural but are Singular: The breaking news broadcasted yesterday were shocking to everyone in the town.',
    options: ['The breaking news', 'broadcasted yesterday', 'were shocking', 'to everyone in the town'],
    correctOptionIndex: 2, // C
  },
  {
    questionText: 'Based on Collective Nouns that look Singular but are Plural: The cattle is grazing in the meadow near the river.',
    options: ['The cattle', 'is grazing', 'in the meadow', 'near the river'],
    correctOptionIndex: 1, // B
  },
  {
    questionText: 'Based on Unit Nouns: I went to the grocery store and bought two dozens apples from the vendor.',
    options: ['I went to the grocery store', 'and bought', 'two dozens', 'apples from the vendor'],
    correctOptionIndex: 2, // C
  },
  {
    questionText: 'Based on the "Uncountable Noun" pattern: The airline accidentally lost all of my heavy luggages during the direct flight.',
    options: ['The airline accidentally', 'lost all of my', 'heavy luggages', 'during the direct flight'],
    correctOptionIndex: 2, // C
  },
  {
    questionText: 'Based on the "Illogical Noun Comparison" pattern: My new car is much faster and more luxurious than my brother.',
    options: ['My new car', 'is much faster', 'and more luxurious', 'than my brother'],
    correctOptionIndex: 3, // D
  },
  {
    questionText: 'Based on the "One of the" pattern: One of the player in our local team has been selected for the national tournament.',
    options: ['One of the player', 'in our local team', 'has been selected', 'for the national tournament'],
    correctOptionIndex: 0, // A
  },
  {
    questionText: 'Based on the "Pair Nouns" pattern: I need to go to the stationary shop to buy a new scissor for my craft project.',
    options: ['I need to go', 'to the stationary shop', 'to buy a new', 'scissor for my craft project'],
    correctOptionIndex: 3, // D
  },
  {
    questionText: 'Based on the "Plural-looking Singular Nouns" pattern: Mathematics are a very difficult subject for many young students to grasp.',
    options: ['Mathematics are', 'a very difficult', 'subject for many', 'young students to grasp'],
    correctOptionIndex: 0, // A
  },
];

async function seed() {
  console.log('🌱 Inserting 15 clean questions into Question Bank & Creating Real Contest...');

  const savedQuestions = [];
  for (let i = 0; i < questionsData.length; i++) {
    const q = questionsData[i];
    const docRef = await addDoc(collection(db, 'question_bank'), {
      ...q,
      createdAt: serverTimestamp(),
    });
    savedQuestions.push({
      id: docRef.id,
      ...q,
    });
    console.log(`Saved Q${i + 1} to question_bank`);
  }

  // Create real contest
  await addDoc(collection(db, 'contests'), {
    title: 'SSC CGL English Grammar Mock Test 2026',
    questions: savedQuestions,
    questionCount: savedQuestions.length,
    createdAt: serverTimestamp(),
  });

  console.log('✅ Created contest "SSC CGL English Grammar Mock Test 2026" with all 15 questions!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
