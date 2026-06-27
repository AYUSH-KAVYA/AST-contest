'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  getDoc,
} from 'firebase/firestore';

interface DraftAnswer {
  contestId: string;
  studentId: string;
  answers: (number | null)[];
  markedForReview: boolean[];
  currentQuestionIndex: number;
  lastUpdated: { seconds: number } | null;
}

interface LiveState {
  isLive: boolean;
  activeContestId: string | null;
}

interface ContestQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
}

export default function LiveProctor() {
  const [liveState, setLiveState] = useState<LiveState>({ isLive: false, activeContestId: null });
  const [drafts, setDrafts] = useState<DraftAnswer[]>([]);
  const [contestQuestions, setContestQuestions] = useState<ContestQuestion[]>([]);
  const [studentEmails, setStudentEmails] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'live_state', 'current'), (snap) => {
      if (snap.exists()) {
        setLiveState(snap.data() as LiveState);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!liveState.isLive || !liveState.activeContestId) {
      setContestQuestions([]);
      return;
    }
    const loadContest = async () => {
      const contestDoc = await getDoc(doc(db, 'contests', liveState.activeContestId!));
      if (contestDoc.exists()) {
        setContestQuestions(contestDoc.data().questions || []);
      }
    };
    loadContest();
  }, [liveState.isLive, liveState.activeContestId]);

  useEffect(() => {
    if (!liveState.isLive || !liveState.activeContestId) {
      setDrafts([]);
      return;
    }
    const q = query(
      collection(db, 'draft_answers'),
      where('contestId', '==', liveState.activeContestId)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const draftList: DraftAnswer[] = snap.docs.map((d) => d.data() as DraftAnswer);
      setDrafts(draftList);

      const emailMap: Record<string, string> = { ...studentEmails };
      for (const draft of draftList) {
        if (!emailMap[draft.studentId]) {
          try {
            const userDoc = await getDoc(doc(db, 'users', draft.studentId));
            if (userDoc.exists()) {
              emailMap[draft.studentId] = userDoc.data().email || draft.studentId;
            }
          } catch {
            emailMap[draft.studentId] = draft.studentId;
          }
        }
      }
      setStudentEmails(emailMap);
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveState.isLive, liveState.activeContestId]);

  const getTimeSince = (timestamp: { seconds: number } | null): string => {
    if (!timestamp) return 'just now';
    const now = Date.now() / 1000;
    const diff = Math.floor(now - timestamp.seconds);
    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  if (!liveState.isLive) {
    return (
      <div className="bg-[#141a2b]/80 border border-white/10 rounded-3xl p-10 shadow-xl backdrop-blur-xl text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center text-2xl text-slate-400 border border-white/10">
          👁️
        </div>
        <h3 className="text-lg font-bold text-white mb-1">No Active Contest</h3>
        <p className="text-slate-400 text-sm">Release a contest from the Live Scheduler to start live proctoring.</p>
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="bg-[#141a2b]/80 border border-white/10 rounded-3xl p-10 shadow-xl backdrop-blur-xl text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
          <span className="text-emerald-400 font-bold text-sm">Contest is Live</span>
        </div>
        <p className="text-white font-semibold mb-1">Waiting for students to begin the exam...</p>
        <p className="text-slate-400 text-sm">Student selections will update here in real-time as they click.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-[#141a2b]/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 bg-emerald-400 rounded-full animate-[pulseGlow_2s_ease-in-out_infinite]" />
          <h2 className="text-lg font-bold text-white">Real-Time Live Proctoring</h2>
        </div>
        <span className="px-3.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">
          {drafts.length} Active Student(s)
        </span>
      </div>

      {drafts.map((draft) => (
        <div key={draft.studentId} className="bg-[#141a2b]/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-amber-700 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-md border border-white/10">
                {(studentEmails[draft.studentId] || 'S')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-white font-bold text-sm">{studentEmails[draft.studentId] || draft.studentId}</p>
                <p className="text-slate-400 text-xs">Currently viewing Question {draft.currentQuestionIndex + 1} &bull; Active {getTimeSince(draft.lastUpdated)}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-pink-500/10 text-pink-400 text-xs font-bold rounded-lg border border-pink-500/20">
                {draft.answers.filter((a) => a !== null && a !== undefined).length} / {contestQuestions.length} Answered
              </span>
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {contestQuestions.map((_, qIdx) => {
              const isAnswered = draft.answers[qIdx] !== null && draft.answers[qIdx] !== undefined;
              const isReview = draft.markedForReview?.[qIdx];
              const isCurrent = qIdx === draft.currentQuestionIndex;
              return (
                <div
                  key={qIdx}
                  title={`Q${qIdx + 1}: ${isAnswered ? `Option ${String.fromCharCode(65 + (draft.answers[qIdx] as number))}` : 'Not answered'}${isReview ? ' (Marked for Review)' : ''}`}
                  className={`relative w-full aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent
                      ? 'ring-2 ring-pink-500 bg-pink-500/20 text-pink-300'
                      : isAnswered
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        : 'bg-white/5 border border-white/10 text-slate-500'
                  }`}
                >
                  {qIdx + 1}
                  {isReview && (
                    <span className="absolute -top-1 -right-1 text-xs">⭐</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 mt-4 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" /> Answered
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded ring-2 ring-pink-500 bg-pink-500/20" /> Current Question
            </span>
            <span className="flex items-center gap-1.5">⭐ Marked for Review</span>
          </div>
        </div>
      ))}
    </div>
  );
}
