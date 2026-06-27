'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import { toggleResultRelease } from '@/lib/submission-logic';

interface QuestionInsight {
  questionText: string;
  options?: string[];
  selectedOption: number | null;
  correctOption: number;
  status: 'correct' | 'incorrect' | 'unattempted';
  markedForReview: boolean;
}

interface Submission {
  id: string;
  contestId: string;
  studentId: string;
  totalScore: number;
  maxScore: number;
  correctCount?: number;
  incorrectCount?: number;
  unattemptedCount?: number;
  markedForReviewCount?: number;
  questionDetails?: QuestionInsight[];
  answers: (number | null)[];
  isResultReleased?: boolean;
  timestamp: { seconds: number } | null;
}

interface ContestMeta {
  id: string;
  title: string;
}

export default function ResultsViewer() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [contestsMap, setContestsMap] = useState<Record<string, ContestMeta>>({});
  const [studentEmails, setStudentEmails] = useState<Record<string, string>>({});
  const [selectedContestId, setSelectedContestId] = useState<string | null>(null);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'submissions'), async (snap) => {
      const subs: Submission[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Submission, 'id'>),
      }));
      setSubmissions(subs);

      const cMap: Record<string, ContestMeta> = { ...contestsMap };
      const sEmails: Record<string, string> = { ...studentEmails };

      for (const sub of subs) {
        if (!cMap[sub.contestId]) {
          try {
            const cDoc = await getDoc(doc(db, 'contests', sub.contestId));
            if (cDoc.exists()) {
              cMap[sub.contestId] = { id: sub.contestId, title: cDoc.data().title || 'Untitled Contest' };
            } else {
              cMap[sub.contestId] = { id: sub.contestId, title: sub.contestId };
            }
          } catch {
            cMap[sub.contestId] = { id: sub.contestId, title: sub.contestId };
          }
        }
        if (!sEmails[sub.studentId]) {
          try {
            const uDoc = await getDoc(doc(db, 'users', sub.studentId));
            if (uDoc.exists()) sEmails[sub.studentId] = uDoc.data().email;
          } catch {
            sEmails[sub.studentId] = sub.studentId;
          }
        }
      }
      setContestsMap(cMap);
      setStudentEmails(sEmails);
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (ts: { seconds: number } | null): string => {
    if (!ts) return 'N/A';
    return new Date(ts.seconds * 1000).toLocaleString();
  };

  const handleToggleRelease = async (sub: Submission) => {
    setReleasingId(sub.id);
    await toggleResultRelease(sub.id, !!sub.isResultReleased);
    setReleasingId(null);
  };

  const contestGrouped = Object.values(contestsMap).map((contest) => {
    const contestSubs = submissions.filter((s) => s.contestId === contest.id);
    const topScore = contestSubs.reduce((max, s) => Math.max(max, s.totalScore), 0);
    return {
      contest,
      submissionsCount: contestSubs.length,
      topScore,
      submissions: contestSubs,
    };
  }).filter((g) => g.submissionsCount > 0);

  if (submissions.length === 0) {
    return (
      <div className="bg-[#141a2b]/80 border border-white/10 rounded-3xl p-12 text-center shadow-xl backdrop-blur-xl">
        <div className="w-16 h-16 bg-pink-500/10 text-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl border border-pink-500/20">
          📊
        </div>
        <h3 className="text-lg font-bold text-white mb-1">No Exam Submissions Yet</h3>
        <p className="text-slate-400 text-sm">Once students submit their completed exams, results and insights will appear here.</p>
      </div>
    );
  }

  const activeGroup = selectedContestId ? contestGrouped.find((g) => g.contest.id === selectedContestId) : null;

  return (
    <div className="space-y-6">
      {/* OVERVIEW LIST OF ALL PAST CONTESTS WITH SUBMISSIONS */}
      {!selectedContestId && (
        <div className="space-y-4">
          <div className="bg-[#141a2b]/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Past Contest Results</h2>
              <p className="text-slate-400 text-sm mt-0.5">Select a contest below to view student scores, release results, and inspect question insights.</p>
            </div>
            <span className="px-3 py-1 bg-amber-500/10 text-amber-400 font-bold text-xs rounded-full border border-amber-500/20">
              SSC CGL (+2 / -0.5)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contestGrouped.map(({ contest, submissionsCount, topScore }) => (
              <div key={contest.id} className="bg-[#141a2b]/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between hover:border-pink-500/40 transition-all">
                <div>
                  <h3 className="text-lg font-bold text-white leading-snug mb-2">{contest.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                    <span>👥 {submissionsCount} {submissionsCount === 1 ? 'Submission' : 'Submissions'}</span>
                    <span>&bull;</span>
                    <span>🏆 Highest Score: <strong className="text-pink-400 font-bold">{topScore} pts</strong></span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-end">
                  <button
                    onClick={() => setSelectedContestId(contest.id)}
                    className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-amber-700 hover:from-pink-500 hover:to-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-pink-600/20 flex items-center gap-1.5"
                  >
                    <span>📊 View Results & Release</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DETAILED DRILL-DOWN VIEW FOR SELECTED CONTEST */}
      {selectedContestId && activeGroup && (
        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-[#141a2b]/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl flex items-center justify-between">
            <div>
              <button
                onClick={() => { setSelectedContestId(null); setExpandedSubmissionId(null); }}
                className="text-xs font-bold text-pink-400 hover:text-pink-300 mb-2 flex items-center gap-1"
              >
                ← Back to Contests Overview
              </button>
              <h2 className="text-xl font-bold text-white">{activeGroup.contest.title}</h2>
              <p className="text-slate-400 text-xs mt-0.5">{activeGroup.submissionsCount} student submission(s) logged</p>
            </div>
            <button
              onClick={() => { setSelectedContestId(null); setExpandedSubmissionId(null); }}
              className="px-4 py-2 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white text-xs font-semibold rounded-xl transition-all"
            >
              Close Insights
            </button>
          </div>

          <div className="space-y-4">
            {activeGroup.submissions.map((sub) => {
              const isExpanded = expandedSubmissionId === sub.id;
              const pct = sub.maxScore > 0 ? Math.round((sub.totalScore / sub.maxScore) * 100) : 0;

              return (
                <div key={sub.id} className="bg-[#141a2b]/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl transition-all">
                  {/* Summary Card Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-gradient-to-br from-pink-500 to-amber-700 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-md border border-white/10">
                        {(studentEmails[sub.studentId] || 'S')[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm">{studentEmails[sub.studentId] || sub.studentId}</h4>
                        <p className="text-slate-400 text-xs">Submitted on {formatDate(sub.timestamp)}</p>
                      </div>
                    </div>

                    {/* Insights Badges & Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="px-3 py-1.5 bg-pink-500/10 border border-pink-500/30 rounded-xl text-xs font-bold text-pink-300">
                        Score: {sub.totalScore} / {sub.maxScore} ({pct}%)
                      </div>

                      {sub.correctCount !== undefined && (
                        <>
                          <div className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-lg" title="Correct (+2.00)">
                            ✅ {sub.correctCount} Correct
                          </div>
                          <div className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-lg" title="Incorrect (-0.50)">
                            ❌ {sub.incorrectCount} Wrong
                          </div>
                          <div className="px-2.5 py-1 bg-white/5 text-slate-400 border border-white/10 text-xs font-bold rounded-lg" title="Unattempted (0.00)">
                            ⬜ {sub.unattemptedCount} Blank
                          </div>
                          <div className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-lg" title="Marked for Review">
                            ⭐ {sub.markedForReviewCount} Review
                          </div>
                        </>
                      )}

                      {/* RELEASE RESULT BUTTON */}
                      <button
                        onClick={() => handleToggleRelease(sub)}
                        disabled={releasingId === sub.id}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border ${
                          sub.isResultReleased
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-amber-600/30 text-amber-300 border-amber-500/40 hover:bg-amber-600/40'
                        }`}
                      >
                        {releasingId === sub.id ? 'Updating...' : sub.isResultReleased ? '✅ Result Released (Click to Revoke)' : '📢 Release Result to Student'}
                      </button>

                      <button
                        onClick={() => setExpandedSubmissionId(isExpanded ? null : sub.id)}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all"
                      >
                        {isExpanded ? 'Hide All Questions ▲' : 'Inspect All Questions ▼'}
                      </button>
                    </div>
                  </div>

                  {/* Expandable ALL QUESTIONS Breakdown */}
                  {isExpanded && sub.questionDetails && (
                    <div className="mt-6 pt-6 border-t border-white/10 space-y-3 animate-[slideUp_0.2s_ease-out]">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Complete Questions Breakdown ({sub.questionDetails.length} Total Questions)</h5>
                        <span className="text-xs text-slate-400">Showing Right, Wrong & Unattempted</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        {sub.questionDetails.map((qd, qIdx) => (
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
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <span className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 ${
                                  qd.status === 'correct'
                                    ? 'bg-emerald-500 text-white'
                                    : qd.status === 'incorrect'
                                      ? 'bg-rose-500 text-white'
                                      : 'bg-slate-700 text-slate-300'
                                }`}>
                                  {qIdx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-white font-bold text-sm leading-snug">{qd.questionText}</p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                {qd.status === 'correct' && <span className="font-bold text-emerald-400 text-xs bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">+2.00 pts</span>}
                                {qd.status === 'incorrect' && <span className="font-bold text-rose-400 text-xs bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30">-0.50 pts</span>}
                                {qd.status === 'unattempted' && <span className="font-semibold text-slate-400 text-xs bg-white/5 px-2 py-0.5 rounded-md">0.00 pts</span>}
                              </div>
                            </div>

                            {/* Options listing */}
                            {qd.options && qd.options.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-2 border-t border-white/5">
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
                                      {isCorrect && <span className="text-emerald-400 font-bold">✓ Correct</span>}
                                      {!isCorrect && isSelected && <span className="text-rose-400 font-bold">✕ Selected</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
