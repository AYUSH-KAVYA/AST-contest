'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';

interface Contest {
  id: string;
  title: string;
  questionCount: number;
}

interface LiveState {
  isLive: boolean;
  activeContestId: string | null;
}

export default function LiveScheduler() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedContestId, setSelectedContestId] = useState<string>('');
  const [liveState, setLiveState] = useState<LiveState>({ isLive: false, activeContestId: null });
  const [showConfirm, setShowConfirm] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchContests = async () => {
      const snap = await getDocs(collection(db, 'contests'));
      const list: Contest[] = snap.docs.map((d) => ({
        id: d.id,
        title: d.data().title || 'Untitled Contest',
        questionCount: d.data().questionCount || d.data().questions?.length || 0,
      }));
      setContests(list);
    };
    fetchContests();

    const unsub = onSnapshot(doc(db, 'live_state', 'current'), (snap) => {
      if (snap.exists()) {
        setLiveState(snap.data() as LiveState);
      }
    });
    return () => unsub();
  }, []);

  const handleToggle = async () => {
    if (!liveState.isLive && !selectedContestId) return;

    if (!liveState.isLive) {
      setShowConfirm(true);
      return;
    }

    setUpdating(true);
    await setDoc(doc(db, 'live_state', 'current'), {
      isLive: false,
      activeContestId: null,
    });
    setUpdating(false);
  };

  const confirmGoLive = async () => {
    setShowConfirm(false);
    setUpdating(true);
    await setDoc(doc(db, 'live_state', 'current'), {
      isLive: true,
      activeContestId: selectedContestId,
    });
    setUpdating(false);
  };

  const activeContest = contests.find((c) => c.id === liveState.activeContestId);

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className={`rounded-3xl p-6 border transition-all ${
        liveState.isLive
          ? 'bg-emerald-500/10 border-emerald-500/30 backdrop-blur-xl'
          : 'bg-[#141a2b]/80 border-white/10 backdrop-blur-xl'
      }`}>
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-3.5 h-3.5 rounded-full ${
            liveState.isLive
              ? 'bg-emerald-400 animate-[pulseGlow_2s_ease-in-out_infinite]'
              : 'bg-slate-500'
          }`} />
          <h3 className="text-lg font-bold text-white">
            {liveState.isLive ? 'Contest is LIVE' : 'No Active Contest'}
          </h3>
        </div>
        {activeContest ? (
          <p className="text-emerald-300 text-sm ml-6 font-medium">
            Currently running: <span className="font-bold underline">{activeContest.title}</span>
          </p>
        ) : (
          <p className="text-slate-400 text-sm ml-6">Select a contest below and toggle Release to broadcast live to students.</p>
        )}
      </div>

      {/* Contest Selector */}
      {!liveState.isLive && (
        <div className="bg-[#141a2b]/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
          <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">Select Contest to Release</label>
          <select
            value={selectedContestId}
            onChange={(e) => setSelectedContestId(e.target.value)}
            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:border-pink-500 transition-all cursor-pointer text-sm"
          >
            <option value="" className="bg-[#111726]">-- Select a contest --</option>
            {contests.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#111726]">
                {c.title} ({c.questionCount} Questions &bull; SSC CGL Pattern)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        disabled={updating || (!liveState.isLive && !selectedContestId)}
        className={`w-full py-4 font-bold rounded-2xl transition-all text-base shadow-xl disabled:opacity-40 disabled:cursor-not-allowed ${
          liveState.isLive
            ? 'bg-gradient-to-r from-rose-600 to-amber-800 text-white hover:from-rose-500 hover:to-amber-700 shadow-rose-600/20'
            : 'bg-gradient-to-r from-pink-600 via-rose-600 to-amber-700 text-white hover:from-pink-500 hover:to-amber-600 shadow-pink-600/20'
        }`}
      >
        {updating ? '⏳ Updating status...' : liveState.isLive ? '⛔ Stop Live Contest' : '🚀 Release Contest (Go Live)'}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#141a2b] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-[slideUp_0.3s_ease-out]">
            <h3 className="text-lg font-bold text-white mb-2">Confirm Release</h3>
            <p className="text-slate-300 text-sm mb-6">
              This will broadcast the selected contest live to all waiting students. Are you sure?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 text-slate-300 font-semibold rounded-xl hover:bg-white/10 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmGoLive}
                className="flex-1 py-2.5 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl transition-all text-sm shadow-md shadow-pink-600/20"
              >
                Go Live 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
