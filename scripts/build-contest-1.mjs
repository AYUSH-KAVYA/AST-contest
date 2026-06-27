import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
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

const allQuestions = [
  // ENGLISH (15 Qs)
  {
    questionText: 'The tourist asked for some informations about the local museum from the guide.',
    options: ['The tourist asked for', 'some informations', 'about the local museum', 'from the guide'],
    correctOptionIndex: 1,
  },
  {
    questionText: 'Ravi is considered to be one of the best student in our entire school.',
    options: ['Ravi is considered to be', 'one of the best student', 'in our', 'entire school'],
    correctOptionIndex: 1,
  },
  {
    questionText: 'She went to the mall and bought beautiful furnitures for her new apartment.',
    options: ['She went to the mall', 'and bought', 'beautiful furnitures', 'for her new apartment'],
    correctOptionIndex: 2,
  },
  {
    questionText: 'The chef accidentally added too many salt to the soup, making it bitter.',
    options: ['The chef accidentally added', 'too many salt', 'to the soup', 'making it bitter'],
    correctOptionIndex: 1,
  },
  {
    questionText: 'One of my closest friend is going to London tomorrow.',
    options: ['One of my', 'closest friend is', 'going to', 'London tomorrow'],
    correctOptionIndex: 1,
  },
  {
    questionText: 'The old farmer has a large flock of sheeps grazing in the green field.',
    options: ['The old farmer', 'has a large flock of', 'sheeps grazing', 'in the green field'],
    correctOptionIndex: 2,
  },
  {
    questionText: 'All my sister-in-laws are coming to visit us this weekend.',
    options: ['All my', 'sister-in-laws', 'are coming', 'to visit us this weekend'],
    correctOptionIndex: 1,
  },
  {
    questionText: 'The breaking news broadcasted yesterday were shocking to everyone in the town.',
    options: ['The breaking news', 'broadcasted yesterday', 'were shocking', 'to everyone in the town'],
    correctOptionIndex: 2,
  },
  {
    questionText: 'The cattle is grazing in the meadow near the river.',
    options: ['The cattle', 'is grazing', 'in the meadow', 'near the river'],
    correctOptionIndex: 1,
  },
  {
    questionText: 'I went to the grocery store and bought two dozens apples from the vendor.',
    options: ['I went to the grocery store', 'and bought', 'two dozens', 'apples from the vendor'],
    correctOptionIndex: 2,
  },
  {
    questionText: 'The airline accidentally lost all of my heavy luggages during the direct flight.',
    options: ['The airline accidentally', 'lost all of my', 'heavy luggages', 'during the direct flight'],
    correctOptionIndex: 2,
  },
  {
    questionText: 'My new car is much faster and more luxurious than my brother.',
    options: ['My new car', 'is much faster', 'and more luxurious', 'than my brother'],
    correctOptionIndex: 3,
  },
  {
    questionText: 'One of the player in our local team has been selected for the national tournament.',
    options: ['One of the player', 'in our local team', 'has been selected', 'for the national tournament'],
    correctOptionIndex: 0,
  },
  {
    questionText: 'I need to go to the stationary shop to buy a new scissor for my craft project.',
    options: ['I need to go', 'to the stationary shop', 'to buy a new', 'scissor for my craft project'],
    correctOptionIndex: 3,
  },
  {
    questionText: 'Mathematics are a very difficult subject for many young students to grasp.',
    options: ['Mathematics are', 'a very difficult', 'subject for many', 'young students to grasp'],
    correctOptionIndex: 0,
  },

  // POLITY (15 Qs)
  {
    questionText: 'Which of the following Acts introduced federal features and provincial autonomy in the legislature and also made provisions for the distribution of legislative powers between the Centre and the provinces?',
    options: ['The Government of India Act, 1919', 'The Government of India Act, 1935', 'The Government of India Act, 1858', 'Indian Councils Act, 1909'],
    correctOptionIndex: 1,
  },
  {
    questionText: 'The concept of ‘Independence of judiciary’ in the Indian Constitution is taken from the Constitution of:',
    options: ['France', 'Britain', 'Ireland', 'The USA'],
    correctOptionIndex: 3,
  },
  {
    questionText: 'The idea of residual powers in the Indian Constitution has been taken from the Constitution of:',
    options: ['South Africa', 'Canada', 'Japan', 'USA'],
    correctOptionIndex: 1,
  },
  {
    questionText: 'G.V. Mavalankar was the Chairman of the ______ of the Constituent Assembly of India.',
    options: ['Advisory Committee on Fundamental Rights, Minorities and Tribal and Excluded Areas', 'Committee on the Functions', 'Order of Business Committee', 'Ad hoc Committee on the National Flag'],
    correctOptionIndex: 1,
  },
  {
    questionText: 'Alladi Krishnaswami Ayyar was the chairman of the ______ of the Constituent Assembly of India.',
    options: ['Credential Committee', 'Union Powers Committee', 'Order of Business Committee', 'Fundamental Rights Sub-Committee'],
    correctOptionIndex: 0,
  },
  {
    questionText: 'Who among the following became a part of the Constituent Assembly from Madras Constituency in 1946?',
    options: ['Ammu Swaminathan', 'Hansa Jivraj Mehta', 'Kamla Chaudhry', 'Begum Aizaz Rasul'],
    correctOptionIndex: 0,
  },
  {
    questionText: 'Which of the following pairs (Educational Event - Key Outcome/Initiative) in British India is correctly matched?',
    options: ['Charter Act, 1813 - Allocated funds for promotion of education', 'Macaulay’s Minute, 1835 - Emphasized traditional Sanskrit learning', 'Serampore Mission - Promoted technical education for elite Indians', 'Orientalist-Anglicist Debate - Resolved by Charter Act, 1833'],
    correctOptionIndex: 0,
  },
  {
    questionText: 'The idea to frame the Constitution of India by an elected Constituent Assembly was first proposed in December 1934 by whom?',
    options: ['Jawaharlal Nehru', 'M. N. Roy', 'B. R. Ambedkar', 'Rajendra Prasad'],
    correctOptionIndex: 1,
  },
  {
    questionText: 'Who was the only Muslim woman in the Constituent Assembly of India?',
    options: ['Begum Aizaz Rasul', 'Kamla Chaudhry', 'Ammu Swaminathan', 'Hansa Jivraj Mehta'],
    correctOptionIndex: 0,
  },
  {
    questionText: 'The Constituent Assembly of India was formed on 9 December 1946 with a total of how many members initially?',
    options: ['299', '389', '284', '395'],
    correctOptionIndex: 1,
  },
  {
    questionText: 'Who was the chairman of the Order of Business Committee of the Constituent Assembly?',
    options: ['K.M. Munshi', 'Jawaharlal Nehru', 'J.B. Kripalani', 'Vallabhbhai Patel'],
    correctOptionIndex: 0,
  },
  {
    questionText: 'How many total women members were a part of the Constituent Assembly of India?',
    options: ['9', '12', '15', '22'],
    correctOptionIndex: 2,
  },
  {
    questionText: 'Who was the chairman of the Advisory Committee on Fundamental Rights, Minorities and Tribal and Excluded Areas in the Constituent Assembly?',
    options: ['Rajendra Prasad', 'Vallabhbhai Patel', 'B.R. Ambedkar', 'J.B. Kripalani'],
    correctOptionIndex: 1,
  },
  {
    questionText: 'How many committees in total were created to deal with different tasks of constitution-making in the Constituent Assembly?',
    options: ['15', '18', '22', '25'],
    correctOptionIndex: 2,
  },
  {
    questionText: 'Who was the chairman of the Ad hoc Committee on the National Flag in the Constituent Assembly?',
    options: ['Rajendra Prasad', 'K.M. Munshi', 'B.R. Ambedkar', 'Vallabhbhai Patel'],
    correctOptionIndex: 0,
  },

  // HISTORY (15 Qs)
  {
    questionText: 'Who among the following was a ruler of the Rashtrakuta dynasty?',
    options: ['Kanishka', 'Samudragupta', 'Dhruva', 'Ashoka'],
    correctOptionIndex: 2,
  },
  {
    questionText: 'Who was the founder of the Chalukya dynasty?',
    options: ['Narasinhavarman', 'Mangales', 'Kirtivarman', 'Pulakesin I'],
    correctOptionIndex: 3,
  },
  {
    questionText: 'Name the state Chandragupta-I got in dowry from the Lichhavis.',
    options: ['Ujjain', 'Pataliputra', 'Prayega', 'Saketa'],
    correctOptionIndex: 1,
  },
  {
    questionText: 'How many great powers (Mahajanpadas) existed in the 7th and early 6th centuries BC, during the life time of Lord Gautam Buddha?',
    options: ['16', '13', '11', '17'],
    correctOptionIndex: 0,
  },
  {
    questionText: 'Which of the following is NOT one of the monarchical states that existed in the 7th and early 6th centuries BC in India?',
    options: ['Magadha', 'Vaishali', 'Avanti', 'Kosala'],
    correctOptionIndex: 1,
  },
  {
    questionText: 'Which of the following places was ruled by the Wadiyar dynasty?',
    options: ['Guwahati', 'Patna', 'Jabalpur', 'Mysore'],
    correctOptionIndex: 3,
  },
  {
    questionText: 'Which of the following Harappan sites is located in Haryana?',
    options: ['Kalibangan', 'Lothal', 'Rakhigarhi', 'Dholavira'],
    correctOptionIndex: 2,
  },
  {
    questionText: 'The seals of the Harappan culture, which often feature animal motifs and an undeciphered script, were primarily made using which locally found material?',
    options: ['Copper', 'Bronze', 'Terracotta', 'Steatite'],
    correctOptionIndex: 3,
  },
  {
    questionText: 'In the Rigveda, the oldest known Vedic Sanskrit text, there is a hymn in the form of a dialogue between Sage Vishvamitra and two rivers worshipped as goddesses. Which are these rivers?',
    options: ['Alakananda and Bhagirathi', 'Ravi and Chenab', 'Ganga and Yamuna', 'Beas and Sutlej'],
    correctOptionIndex: 3,
  },
  {
    questionText: 'The Vedic Aryans lived in the area called Sapt-Sindhu, which means the area drained by seven rivers. One of the rivers among the seven is Jhelum. What was its ancient name?',
    options: ['Askini', 'Parushni', 'Vipash', 'Vitasta'],
    correctOptionIndex: 3,
  },
  {
    questionText: 'The Vedic Civilisation in India is believed to have flourished along the banks of which river?',
    options: ['Godavari', 'Saraswati', 'Tapi', 'Narmada'],
    correctOptionIndex: 1,
  },
  {
    questionText: 'Which pillar inscription recorded the achievements of Samudra Gupta, who was famously known as the ‘Napoleon of India’ for his conquests?',
    options: ['Iron Pillar', 'Vijaya Stambha', 'Allahabad Pillar', 'Sun Pillar'],
    correctOptionIndex: 2,
  },
  {
    questionText: 'Details about the Sudarshana Lake are given in a rock inscription at Girnar (Junagarh). This inscription was composed to record the achievements of which Shaka ruler?',
    options: ['Chashtana', 'Rudradaman I', 'Rudrasimha III', 'Maues'],
    correctOptionIndex: 1,
  },
  {
    questionText: 'The \'Harshacharita\' is a biography of Harshavardhana, the ruler of Kannauj. It was composed in Sanskrit by his court poet, ________.',
    options: ['Banabhatta', 'Kamban', 'Dandin', 'Jinsena'],
    correctOptionIndex: 0,
  },
  {
    questionText: 'The National Emblem of India features the motto \'Satyameva Jayate\' inscribed below the abacus. This motto was taken from which ancient historical source?',
    options: ['Rigveda', 'Mundaka Upanishad', 'Bhagavad Gita', 'Arthashastra'],
    correctOptionIndex: 1,
  },
];

async function cleanCollection(collectionName) {
  const snap = await getDocs(collection(db, collectionName));
  for (const d of snap.docs) {
    await deleteDoc(doc(db, collectionName, d.id));
  }
}

async function run() {
  console.log('🧹 Wiping all existing database documents...');
  await cleanCollection('contests');
  await cleanCollection('question_bank');
  await cleanCollection('draft_answers');
  await cleanCollection('submissions');

  await setDoc(doc(db, 'live_state', 'current'), {
    isLive: false,
    activeContestId: null,
  });
  console.log('Cleared all existing data and reset live_state!');

  console.log('🌱 Populating 45 clean questions into Question Bank & creating "CONTEST 1"...');
  const savedQuestions = [];
  for (let i = 0; i < allQuestions.length; i++) {
    const q = allQuestions[i];
    const docRef = await addDoc(collection(db, 'question_bank'), {
      ...q,
      createdAt: serverTimestamp(),
    });
    savedQuestions.push({
      id: docRef.id,
      ...q,
    });
    console.log(`Saved Q${i + 1}/45 to question_bank`);
  }

  await addDoc(collection(db, 'contests'), {
    title: 'CONTEST 1',
    questions: savedQuestions,
    questionCount: savedQuestions.length,
    createdAt: serverTimestamp(),
  });

  console.log('✅ "CONTEST 1" with all 45 questions created successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Build CONTEST 1 failed:', err);
  process.exit(1);
});
