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

const historyReQuestions = [
  {
    questionText: 'The period of human history for which NO written records or scripts are available is officially termed as the ________.',
    options: ['Historic Period', 'Proto-historic Period', 'Pre-historic Period', 'Medieval Period'],
    correctOptionIndex: 2, // C
  },
  {
    questionText: 'In the context of ancient Indian historical sources, the scientific study of inscriptions is known as ________.',
    options: ['Numismatics', 'Epigraphy', 'Calligraphy', 'Paleography'],
    correctOptionIndex: 1, // B
  },
  {
    questionText: 'A \'celt\' is a polished stone tool associated with which specific Pre-historic period?',
    options: ['Paleolithic Age', 'Mesolithic Age', 'Neolithic Age', 'Chalcolithic Age'],
    correctOptionIndex: 2, // C
  },
  {
    questionText: 'In the study of historical sources, \'Numismatics\' refers to the study of what?',
    options: ['Ancient manuscripts', 'Fossilized remains', 'Ancient monuments', 'Coins and medals'],
    correctOptionIndex: 3, // D
  },
  {
    questionText: 'Tiny stone tools, generally measuring from 1 to 5 centimeters in length, known as \'microliths\', are the characteristic tools of which Pre-historic age?',
    options: ['Paleolithic Age', 'Mesolithic Age', 'Neolithic Age', 'Iron Age'],
    correctOptionIndex: 1, // B
  },
  {
    questionText: 'Which of the following was the very first metal discovered and used by Pre-historic humans, marking the transition out of the pure Stone Age?',
    options: ['Iron', 'Bronze', 'Copper', 'Gold'],
    correctOptionIndex: 2, // C
  },
  {
    questionText: 'The Bhimbetka rock shelters in Madhya Pradesh are a crucial Pre-historic source famous for what?',
    options: ['Early Buddhist stupas', 'Pre-historic cave paintings', 'Ashokan rock edicts', 'Megalithic burials'],
    correctOptionIndex: 1, // B
  },
  {
    questionText: 'The decipherment of the ancient Brahmi script in 1837 was a massive breakthrough for reading Indian historical sources. Who deciphered it?',
    options: ['Alexander Cunningham', 'James Prinsep', 'John Marshall', 'Mortimer Wheeler'],
    correctOptionIndex: 1, // B
  },
  {
    questionText: 'Which Pre-historic period is characterized by the major human shift from being \'hunter-gatherers\' to \'food-producers\' (the beginning of settled agriculture)?',
    options: ['Paleolithic Age', 'Mesolithic Age', 'Neolithic Age', 'Chalcolithic Age'],
    correctOptionIndex: 2, // C
  },
  {
    questionText: 'The archaeological site of Burzahom in Kashmir is an important Pre-historic site known for which unique feature?',
    options: ['Pit-dwellings and dog burials', 'Large dockyards', 'Use of iron tools', 'Early copper smelting'],
    correctOptionIndex: 0, // A
  },
  {
    questionText: 'The study of the physical and material remains of the past (such as ruins, pottery, and tools) to understand human history is called ________.',
    options: ['Philology', 'Anthropology', 'Archaeology', 'Genealogy'],
    correctOptionIndex: 2, // C
  },
  {
    questionText: 'In Pre-historic India, large stone boulders used to mark burial sites or graves are technically referred to as ________.',
    options: ['Microliths', 'Monoliths', 'Megaliths', 'Petroglyphs'],
    correctOptionIndex: 2, // C
  },
  {
    questionText: 'The \'Old Stone Age\', which covers 99% of human history and features large, unpolished stone tools, is scientifically referred to as the ________.',
    options: ['Paleolithic Age', 'Mesolithic Age', 'Neolithic Age', 'Chalcolithic Age'],
    correctOptionIndex: 0, // A
  },
  {
    questionText: 'Radiocarbon dating (C-14) is a scientific technique heavily used in historical sources and archaeology to determine what?',
    options: ['The exact depth of soil layers', 'The age of organic materials and fossils', 'The composition of ancient metal coins', 'The decipherment of unknown scripts'],
    correctOptionIndex: 1, // B
  },
  {
    questionText: 'The earliest known Pre-historic evidence of agriculture in the Indian subcontinent (specifically wheat and barley cultivation) was found at which archaeological site?',
    options: ['Mehrgarh', 'Dholavira', 'Hastinapur', 'Ujjain'],
    correctOptionIndex: 0, // A
  },
];

async function run() {
  console.log('🌱 Adding 15 history questions into Question Bank & creating "HISTORY RE CONTEST"...');
  
  const savedQuestions = [];
  for (let i = 0; i < historyReQuestions.length; i++) {
    const q = historyReQuestions[i];
    const docRef = await addDoc(collection(db, 'question_bank'), {
      ...q,
      createdAt: serverTimestamp(),
    });
    savedQuestions.push({
      id: docRef.id,
      ...q,
    });
    console.log(`Saved Q${i + 1}/15 to question_bank`);
  }

  await addDoc(collection(db, 'contests'), {
    title: 'HISTORY RE CONTEST',
    questions: savedQuestions,
    questionCount: savedQuestions.length,
    createdAt: serverTimestamp(),
  });

  console.log('✅ "HISTORY RE CONTEST" created successfully with 15 questions while keeping CONTEST 1 intact!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed creating HISTORY RE CONTEST:', err);
  process.exit(1);
});
