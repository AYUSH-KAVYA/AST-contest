'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp, collection, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { saveExamState, loadExamState, clearExamState } from '@/lib/exam-storage';
import { submitTest, type Question, type QuestionInsight } from '@/lib/submission-logic';

type PortalState = 'waiting' | 'exam' | 'submitted';

interface ReleasedSubmission {
  contestId: string;
  totalScore: number;
  maxScore: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  markedForReviewCount: number;
  questionDetails: QuestionInsight[];
  isResultReleased: boolean;
}

export default function PortalPage() {
  return (
    <ProtectedRoute requiredRole="student">
      <StudentPortal />
    </ProtectedRoute>
  );
}

function StudentPortal() {
  const { user, logout } = useAuth();
  const [portalState, setPortalState] = useState<PortalState>('waiting');
  const [isLive, setIsLive] = useState(false);
  const [activeContestId, setActiveContestId] = useState<string | null>(null);
  const [contestTitle, setContestTitle] = useState<string>('SSC CGL Examination');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [markedForReview, setMarkedForReview] = useState<boolean[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [releasedSubmission, setReleasedSubmission] = useState<ReleasedSubmission | null>(null);
  const [hasSubmittedActive, setHasSubmittedActive] = useState(false);

  // Sync to Firestore draft_answers for real-time admin proctoring
  const syncToFirestore = useCallback(
    (newAnswers: (number | null)[], newReview: boolean[], newIndex: number) => {
      if (!user || !activeContestId) return;
      const draftRef = doc(db, 'draft_answers', `${activeContestId}__${user.uid}`);
      setDoc(draftRef, {
        contestId: activeContestId,
        studentId: user.uid,
        answers: newAnswers,
        markedForReview: newReview,
        currentQuestionIndex: newIndex,
        lastUpdated: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    },
    [user, activeContestId]
  );

  const persistState = useCallback(
    (newAnswers: (number | null)[], newReview: boolean[], newIndex: number) => {
      if (!activeContestId) return;
      saveExamState({
        contestId: activeContestId,
        answers: newAnswers,
        markedForReview: newReview,
        currentQuestionIndex: newIndex,
        lastUpdated: Date.now(),
      });
      syncToFirestore(newAnswers, newReview, newIndex);
    },
    [activeContestId, syncToFirestore]
  );

  // Listen to live_state
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'live_state', 'current'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setIsLive(data.isLive);
        setActiveContestId(data.activeContestId);
      } else {
        setIsLive(false);
        setActiveContestId(null);
      }
    });
    return () => unsub();
  }, []);

  // Listen to student's submission document specifically for the active contest or recent submission
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'submissions'),
      where('studentId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const docs = snap.docs.map(d => d.data() as ReleasedSubmission);
        
        // Check if active contest is submitted
        if (activeContestId) {
          const activeSub = docs.find(d => d.contestId === activeContestId);
          if (activeSub) {
            setHasSubmittedActive(true);
            setReleasedSubmission(activeSub);
            setPortalState('submitted');
            return;
          }
        }
        
        // Otherwise grab the latest submission for viewing released results when no active contest is running
        const latestSub = docs[docs.length - 1];
        setReleasedSubmission(latestSub);
        if (!isLive) {
          setPortalState('submitted');
        }
      } else {
        setHasSubmittedActive(false);
        setReleasedSubmission(null);
      }
    });
    return () => unsub();
  }, [user, activeContestId, isLive]);

  // Load contest when live and not already submitted
  useEffect(() => {
    if (!isLive || !activeContestId || hasSubmittedActive) {
      if (!isLive && !releasedSubmission) {
        setPortalState('waiting');
      }
      return;
    }

    const loadContest = async () => {
      try {
        const contestDoc = await getDoc(doc(db, 'contests', activeContestId));
        if (!contestDoc.exists()) return;

        const contestData = contestDoc.data();
        setContestTitle(contestData.title || 'SSC CGL Examination');

        const qs: Question[] = (contestData.questions || []).map((q: Question, i: number) => ({
          ...q,
          id: q.id || `q_${i}`,
        }));
        setQuestions(qs);

        const saved = loadExamState(activeContestId);
        if (saved && saved.answers.length === qs.length) {
          setAnswers(saved.answers);
          setMarkedForReview(saved.markedForReview);
          setCurrentIndex(saved.currentQuestionIndex);
        } else {
          setAnswers(new Array(qs.length).fill(null));
          setMarkedForReview(new Array(qs.length).fill(false));
          setCurrentIndex(0);
        }

        setPortalState('exam');
      } catch (err) {
        console.error('Failed to load contest:', err);
      }
    };
    loadContest();
  }, [isLive, activeContestId, hasSubmittedActive, releasedSubmission]);

  const selectOption = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = optionIndex;
    setAnswers(newAnswers);
    persistState(newAnswers, markedForReview, currentIndex);
  };

  const toggleReview = () => {
    const newReview = [...markedForReview];
    newReview[currentIndex] = !newReview[currentIndex];
    setMarkedForReview(newReview);
    persistState(answers, newReview, currentIndex);
  };

  const goToQuestion = (idx: number) => {
    if (idx < 0 || idx >= questions.length) return;
    setCurrentIndex(idx);
    persistState(answers, markedForReview, idx);
  };

  const handleSubmit = async () => {
    if (!user || !activeContestId) return;
    setSubmitting(true);
    setShowSubmitConfirm(false);
    const result = await submitTest(activeContestId, user.uid, answers, markedForReview, questions);
    if (result.success) {
      clearExamState(activeContestId);
      setHasSubmittedActive(true);
      setPortalState('submitted');
    } else {
      alert('Submission failed. Please check connection and try again.');
    }
    setSubmitting(false);
  };

  // ===== WAITING SCREEN =====
  if (portalState === 'waiting' || (!isLive && portalState !== 'submitted')) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-pink-600/10 rounded-full blur-3xl" />
        <div className="max-w-md w-full text-center relative z-10">
          <div className="absolute top-4 right-4">
            <button
              onClick={logout}
              className="text-slate-400 hover:text-white text-xs font-bold bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl transition-colors"
            >
              Sign Out
            </button>
          </div>

          <div className="relative mb-8">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-[#141a2b] border border-white/10 flex items-center justify-center shadow-2xl animate-[pulseGlow_3s_ease-in-out_infinite]">
              <span className="text-4xl">🔒</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            Akkiyu School of Technology
          </h1>
          <p className="text-pink-400 font-bold text-sm mb-1">
            Waiting for Admin to release a live contest...
          </p>
          <p className="text-slate-400 text-xs">
            The exam will launch automatically on this screen the moment the Admin triggers Go Live.
          </p>

          <div className="flex items-center justify-center gap-2 mt-8">
            <div className="w-2.5 h-2.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2.5 h-2.5 bg-amber-600 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
            <div className="w-2.5 h-2.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>
      </div>
    );
  }

  // ===== SUBMITTED / RESULT RELEASED SCREEN =====
  if (portalState === 'submitted') {
    const isReleased = releasedSubmission?.isResultReleased;

    return (
      <div className="min-h-screen bg-[#090d16] p-4 flex flex-col items-center justify-start py-8">
        <div className="max-w-md w-full space-y-6 animate-[slideUp_0.5s_ease-out]">
          
          {/* Header Card */}
          <div className="bg-[#141a2b]/90 border border-white/10 rounded-3xl p-6 shadow-2xl text-center backdrop-blur-xl relative">
            <button
              onClick={logout}
              className="absolute top-4 right-4 text-xs font-bold text-slate-400 hover:text-white bg-white/5 border border-white/10 px-3 py-1 rounded-lg"
            >
              Sign Out
            </button>

            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl shadow-lg border ${
              isReleased
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-pink-500/20 border-pink-500/40 text-pink-400'
            }`}>
              {isReleased ? '🏆' : '✓'}
            </div>

            <h1 className="text-2xl font-bold text-white mb-1">
              {isReleased ? 'Exam Results Released!' : 'Test Submitted Successfully!'}
            </h1>
            <p className="text-slate-400 text-xs">
              {isReleased
                ? 'Your performance insights and detailed question breakdown are unlocked below.'
                : 'Thank you, test submitted successfully. Your score & solution breakdown will appear here once released by admin.'}
            </p>
          </div>

          {/* RELEASED RESULT INSIGHTS */}
          {isReleased && releasedSubmission && (
            <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
              {/* Score Card */}
              <div className="bg-gradient-to-br from-pink-600/20 via-rose-600/20 to-amber-700/20 border border-pink-500/30 rounded-3xl p-6 shadow-xl text-center backdrop-blur-xl">
                <p className="text-xs font-bold text-pink-300 uppercase tracking-wider mb-1">Your Total Score (SSC CGL)</p>
                <div className="text-4xl font-black text-white mb-2">
                  {releasedSubmission.totalScore} <span className="text-xl font-normal text-slate-400">/ {releasedSubmission.maxScore} pts</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-white/10 text-xs font-bold">
                  <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 py-2 rounded-xl">
                    ✅ {releasedSubmission.correctCount} Right
                  </div>
                  <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 py-2 rounded-xl">
                    ❌ {releasedSubmission.incorrectCount} Wrong
                  </div>
                  <div className="bg-white/5 border border-white/10 text-slate-400 py-2 rounded-xl">
                    ⬜ {releasedSubmission.unattemptedCount} Blank
                  </div>
                  <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 py-2 rounded-xl">
                    ⭐ {releasedSubmission.markedForReviewCount} Review
                  </div>
                </div>
              </div>

              {/* ALL QUESTIONS BREAKDOWN FOR STUDENT */}
              <div className="bg-[#141a2b]/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
                  Complete Solution Breakdown ({releasedSubmission.questionDetails?.length || 0} Questions)
                </h3>

                <div className="space-y-3">
                  {releasedSubmission.questionDetails?.map((qd, qIdx) => (
                    <div
                      key={qIdx}
                      className={`p-4 rounded-2xl border transition-all ${
                        qd.status === 'correct'
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : qd.status === 'incorrect'
                            ? 'bg-rose-500/10 border-rose-500/30'
                            : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <span className={`w-6 h-6 rounded-lg font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 ${
                            qd.status === 'correct'
                              ? 'bg-emerald-500 text-white'
                              : qd.status === 'incorrect'
                                ? 'bg-rose-500 text-white'
                                : 'bg-slate-700 text-slate-300'
                          }`}>
                            {qIdx + 1}
                          </span>
                          <p className="text-white font-semibold text-xs leading-snug">{qd.questionText}</p>
                        </div>
                        <span className="text-[11px] font-bold shrink-0">
                          {qd.status === 'correct' && <span className="text-emerald-400">+2.00 pts</span>}
                          {qd.status === 'incorrect' && <span className="text-rose-400">-0.50 pts</span>}
                          {qd.status === 'unattempted' && <span className="text-slate-400">0.00 pts</span>}
                        </span>
                      </div>

                      {/* Options breakdown */}
                      {qd.options && qd.options.length > 0 && (
                        <div className="grid grid-cols-1 gap-1.5 mt-2 pt-2 border-t border-white/5">
                          {qd.options.map((opt, oIdx) => {
                            const isSelected = qd.selectedOption === oIdx;
                            const isCorrect = qd.correctOption === oIdx;
                            return (
                              <div
                                key={oIdx}
                                className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between border ${
                                  isCorrect
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                                    : isSelected
                                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-bold'
                                      : 'bg-white/5 border-white/5 text-slate-400'
                                }`}
                              >
                                <span>{String.fromCharCode(65 + oIdx)}: {opt}</span>
                                {isCorrect && <span className="text-emerald-400 font-bold">✓ Correct Answer</span>}
                                {!isCorrect && isSelected && <span className="text-rose-400 font-bold">✕ Your Choice</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== EXAM INTERFACE =====
  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const answeredCount = answers.filter((a) => a !== null && a !== undefined).length;
  const reviewCount = markedForReview.filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col">
      <div className="max-w-md w-full mx-auto flex flex-col flex-1 bg-[#141a2b]/90 border-x border-white/10 shadow-2xl">
        
        {/* HEADER WITH TOP SUBMIT BUTTON */}
        <header className="sticky top-0 z-30 bg-[#141a2b]/95 backdrop-blur-md border-b border-white/10 px-4 py-3 shadow-md">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-white font-bold text-sm truncate">{contestTitle}</h2>
              <p className="text-pink-400 text-[11px] font-semibold">SSC CGL (+2.00 / -0.50 marks)</p>
            </div>

            <button
              onClick={() => setShowSubmitConfirm(true)}
              disabled={submitting}
              className="px-4 py-2 bg-gradient-to-r from-pink-600 via-rose-600 to-amber-700 hover:from-pink-500 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-pink-600/20 shrink-0 transition-all active:scale-95"
            >
              ✓ Submit Test
            </button>
          </div>

          <div className="bg-white/5 rounded-full h-1.5 overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-600 rounded-full transition-all duration-300"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
            <span>Q <strong className="text-pink-400 font-bold">{currentIndex + 1}</strong> of {questions.length}</span>
            <span>{answeredCount} Answered &bull; ⭐ {reviewCount} Review</span>
          </div>

          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto py-0.5">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToQuestion(idx)}
                className={`w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center transition-all ${
                  idx === currentIndex
                    ? 'bg-pink-600 text-white ring-2 ring-pink-400/60'
                    : answers[idx] !== null && answers[idx] !== undefined
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-white/5 text-slate-400 border border-white/5'
                } ${markedForReview[idx] ? 'ring-2 ring-amber-500' : ''}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </header>

        {/* QUESTION DISPLAY CONTAINER */}
        <main className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 mb-6 shadow-sm">
            <span className="inline-block text-[11px] font-bold text-pink-400 bg-pink-500/10 px-2.5 py-0.5 rounded-md mb-2 border border-pink-500/20">
              Question #{currentIndex + 1}
            </span>
            <p className="text-white text-base font-semibold leading-relaxed">{currentQuestion.questionText}</p>
          </div>

          {/* OPTIONS */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, optIdx) => {
              const isSelected = answers[currentIndex] === optIdx;
              return (
                <button
                  key={optIdx}
                  onClick={() => selectOption(optIdx)}
                  className={`w-full text-left px-5 py-4 rounded-2xl border transition-all min-h-[56px] active:scale-[0.99] flex items-center justify-between ${
                    isSelected
                      ? 'bg-pink-500/20 border-pink-500/60 text-pink-200 font-semibold shadow-md'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                      isSelected
                        ? 'border-pink-500 bg-pink-600 text-white'
                        : 'border-slate-600 text-slate-400'
                    }`}>
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="text-sm">{option}</span>
                  </div>
                  {isSelected && <span className="text-pink-400 text-sm font-bold">✓</span>}
                </button>
              );
            })}
          </div>
        </main>

        {/* FIXED BOTTOM NAVIGATION BAR */}
        <footer className="sticky bottom-0 bg-[#141a2b]/95 backdrop-blur-md border-t border-white/10 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => goToQuestion(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="px-4 py-3 bg-white/5 border border-white/10 text-slate-300 text-xs font-bold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all flex-1"
            >
              ← Prev
            </button>

            <button
              onClick={toggleReview}
              className={`px-4 py-3 rounded-xl text-xs font-bold transition-all flex-1 border ${
                markedForReview[currentIndex]
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              ⭐ {markedForReview[currentIndex] ? 'Unmark Review' : 'Mark Review'}
            </button>

            <button
              onClick={() => goToQuestion(currentIndex + 1)}
              disabled={currentIndex === questions.length - 1}
              className="px-4 py-3 bg-gradient-to-r from-pink-600 via-rose-600 to-amber-700 hover:from-pink-500 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md flex-1 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        </footer>
      </div>

      {/* CONFIRM SUBMIT MODAL */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#141a2b] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-[slideUp_0.3s_ease-out]">
            <h3 className="text-lg font-bold text-white mb-2">Submit Exam?</h3>
            <p className="text-slate-300 text-sm mb-4">
              Are you sure you want to submit your test? Here is your current summary:
            </p>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 mb-4 text-xs font-medium text-slate-300">
              <div className="flex justify-between">
                <span>Attempted Questions:</span>
                <strong className="text-emerald-400 font-bold">{answeredCount} / {questions.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Unattempted / Skipped:</span>
                <strong className="text-slate-400 font-bold">{questions.length - answeredCount}</strong>
              </div>
              <div className="flex justify-between">
                <span>Marked for Review:</span>
                <strong className="text-amber-400 font-bold">{reviewCount}</strong>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] mb-6">
              SSC CGL Scoring (+2.00 correct, -0.50 incorrect). Answers cannot be changed after submission.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-2.5 bg-white/5 text-slate-300 font-semibold rounded-xl hover:bg-white/10 text-xs"
              >
                Resume Test
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 bg-gradient-to-r from-pink-600 via-rose-600 to-amber-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50 text-xs"
              >
                {submitting ? 'Submitting...' : 'Confirm Submit ✓'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
