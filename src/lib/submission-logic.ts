import { db } from './firebase';
import { writeBatch, doc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import { clearExamState } from './exam-storage';

export interface Question {
  id?: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
}

export interface QuestionInsight {
  questionText: string;
  options: string[];
  selectedOption: number | null;
  correctOption: number;
  status: 'correct' | 'incorrect' | 'unattempted';
  markedForReview: boolean;
}

export interface ExamInsights {
  totalScore: number;
  maxScore: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  markedForReviewCount: number;
  questionDetails: QuestionInsight[];
}

export function calculateExamInsights(
  answers: (number | null)[],
  markedForReview: boolean[],
  questions: Question[]
): ExamInsights {
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;
  let markedForReviewCount = 0;

  const questionDetails: QuestionInsight[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const ans = answers[i];
    const isReview = !!markedForReview[i];
    if (isReview) markedForReviewCount++;

    let status: 'correct' | 'incorrect' | 'unattempted' = 'unattempted';
    if (ans === null || ans === undefined) {
      unattemptedCount++;
      status = 'unattempted';
    } else if (ans === q.correctOptionIndex) {
      correctCount++;
      status = 'correct';
    } else {
      incorrectCount++;
      status = 'incorrect';
    }

    questionDetails.push({
      questionText: q.questionText,
      options: q.options || [],
      selectedOption: ans,
      correctOption: q.correctOptionIndex,
      status,
      markedForReview: isReview,
    });
  }

  // SSC CGL Scoring Logic: +2.00 for correct, -0.50 for incorrect, 0 for unattempted
  const rawScore = (correctCount * 2) - (incorrectCount * 0.5);
  const totalScore = Math.round(rawScore * 100) / 100;
  const maxScore = questions.length * 2;

  return {
    totalScore,
    maxScore,
    correctCount,
    incorrectCount,
    unattemptedCount,
    markedForReviewCount,
    questionDetails,
  };
}

export async function submitTest(
  contestId: string,
  studentId: string,
  answers: (number | null)[],
  markedForReview: boolean[],
  questions: Question[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const insights = calculateExamInsights(answers, markedForReview, questions);
    const batch = writeBatch(db);

    // 1. Add submission document with granular insights and default isResultReleased = false
    const submissionRef = doc(collection(db, 'submissions'));
    batch.set(submissionRef, {
      contestId,
      studentId,
      answers,
      markedForReview,
      totalScore: insights.totalScore,
      maxScore: insights.maxScore,
      correctCount: insights.correctCount,
      incorrectCount: insights.incorrectCount,
      unattemptedCount: insights.unattemptedCount,
      markedForReviewCount: insights.markedForReviewCount,
      questionDetails: insights.questionDetails,
      isResultReleased: false,
      timestamp: serverTimestamp(),
    });

    // 2. Delete the draft_answers document (cleanup)
    const draftRef = doc(db, 'draft_answers', `${contestId}__${studentId}`);
    batch.delete(draftRef);

    await batch.commit();

    // 3. Clear localStorage
    clearExamState(contestId);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function toggleResultRelease(submissionId: string, currentStatus: boolean): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'submissions', submissionId), {
      isResultReleased: !currentStatus,
    });
    return true;
  } catch (err) {
    console.error('Failed to toggle result release:', err);
    return false;
  }
}
