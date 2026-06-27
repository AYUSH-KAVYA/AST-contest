'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

interface QuestionDraft {
  id?: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
}

interface ContestDoc {
  id: string;
  title: string;
  questions: QuestionDraft[];
  questionCount: number;
}

export default function ContestBuilder() {
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [contests, setContests] = useState<ContestDoc[]>([]);
  const [editingContestId, setEditingContestId] = useState<string | null>(null);

  const [contestTitle, setContestTitle] = useState('');
  const [draftQuestions, setDraftQuestions] = useState<QuestionDraft[]>([]);

  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correctIndex, setCorrectIndex] = useState<number>(0);

  const [bankQuestions, setBankQuestions] = useState<QuestionDraft[]>([]);
  const [showBank, setShowBank] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadContests();
    loadQuestionBank();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadContests = async () => {
    try {
      const snap = await getDocs(collection(db, 'contests'));
      const list: ContestDoc[] = snap.docs.map((d) => ({
        id: d.id,
        title: d.data().title || 'Untitled Contest',
        questions: d.data().questions || [],
        questionCount: d.data().questionCount || d.data().questions?.length || 0,
      }));
      setContests(list);
    } catch {
      console.error('Failed to load contests');
    }
  };

  const loadQuestionBank = async () => {
    try {
      const q = query(collection(db, 'question_bank'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const questions: QuestionDraft[] = snap.docs.map((d) => ({
        id: d.id,
        questionText: d.data().questionText,
        options: d.data().options,
        correctOptionIndex: d.data().correctOptionIndex,
      }));
      setBankQuestions(questions);
    } catch {
      try {
        const snap = await getDocs(collection(db, 'question_bank'));
        const questions: QuestionDraft[] = snap.docs.map((d) => ({
          id: d.id,
          questionText: d.data().questionText,
          options: d.data().options,
          correctOptionIndex: d.data().correctOptionIndex,
        }));
        setBankQuestions(questions);
      } catch {
        console.error('Failed to load question bank');
      }
    }
  };

  const startNewContest = () => {
    setEditingContestId(null);
    setContestTitle('');
    setDraftQuestions([]);
    resetQuestionForm();
    setViewMode('editor');
  };

  const editExistingContest = (contest: ContestDoc) => {
    setEditingContestId(contest.id);
    setContestTitle(contest.title);
    setDraftQuestions(contest.questions);
    resetQuestionForm();
    setViewMode('editor');
  };

  const resetQuestionForm = () => {
    setEditingQuestionIdx(null);
    setQuestionText('');
    setOptions(['', '']);
    setCorrectIndex(0);
  };

  const addOption = () => setOptions([...options, '']);

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, i) => i !== idx);
    setOptions(newOptions);
    if (correctIndex >= newOptions.length) setCorrectIndex(0);
  };

  const updateOption = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  const saveQuestionToDraft = async () => {
    if (!questionText.trim()) { showToast('Question text is required'); return; }
    if (options.some((o) => !o.trim())) { showToast('All options must be filled'); return; }

    const newQ: QuestionDraft = {
      questionText: questionText.trim(),
      options: options.map((o) => o.trim()),
      correctOptionIndex: correctIndex,
    };

    if (editingQuestionIdx !== null) {
      const updatedDraft = [...draftQuestions];
      updatedDraft[editingQuestionIdx] = newQ;
      setDraftQuestions(updatedDraft);
      showToast('Question updated in draft!');
    } else {
      try {
        const docRef = await addDoc(collection(db, 'question_bank'), {
          ...newQ,
          createdAt: serverTimestamp(),
        });
        newQ.id = docRef.id;
      } catch {
        // Continue even if bank fails
      }
      setDraftQuestions([...draftQuestions, newQ]);
      showToast('Question added to draft!');
    }

    resetQuestionForm();
    loadQuestionBank();
  };

  const startEditQuestionInDraft = (idx: number) => {
    const q = draftQuestions[idx];
    setEditingQuestionIdx(idx);
    setQuestionText(q.questionText);
    setOptions([...q.options]);
    setCorrectIndex(q.correctOptionIndex);
  };

  const removeDraftQuestion = (idx: number) => {
    setDraftQuestions(draftQuestions.filter((_, i) => i !== idx));
    if (editingQuestionIdx === idx) resetQuestionForm();
  };

  const addFromBank = (q: QuestionDraft) => {
    setDraftQuestions([...draftQuestions, q]);
    showToast('Question added from bank!');
  };

  const saveFinalContest = async () => {
    if (!contestTitle.trim()) { showToast('Contest title is required'); return; }
    if (draftQuestions.length === 0) { showToast('Add at least one question'); return; }
    setSaving(true);

    try {
      const contestPayload = {
        title: contestTitle.trim(),
        questions: draftQuestions.map((q) => ({
          questionText: q.questionText,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
        })),
        questionCount: draftQuestions.length,
        updatedAt: serverTimestamp(),
      };

      if (editingContestId) {
        await updateDoc(doc(db, 'contests', editingContestId), contestPayload);
        showToast('Contest updated successfully!');
      } else {
        await addDoc(collection(db, 'contests'), {
          ...contestPayload,
          createdAt: serverTimestamp(),
        });
        showToast('New contest created successfully!');
      }

      await loadContests();
      setViewMode('list');
    } catch {
      showToast('Failed to save contest');
    }
    setSaving(false);
  };

  const filteredBank = bankQuestions.filter((q) =>
    q.questionText.toLowerCase().includes(bankSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-pink-600 text-white px-5 py-3 rounded-2xl shadow-xl animate-[slideUp_0.3s_ease-out] text-sm font-semibold flex items-center gap-2 border border-pink-400">
          <span>✨</span>
          <span>{toast}</span>
        </div>
      )}

      {/* VIEW 1: CONTEST LIST (DEFAULT ADMIN VIEW) */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-[#141a2b]/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
            <div>
              <h2 className="text-xl font-bold text-white">Existing Contests</h2>
              <p className="text-slate-400 text-sm mt-0.5">Select a contest to edit questions or create a new one.</p>
            </div>
            <span className="px-3.5 py-1.5 bg-pink-500/10 text-pink-400 font-semibold text-xs rounded-full border border-pink-500/20">
              {contests.length} {contests.length === 1 ? 'Contest' : 'Contests'} Total
            </span>
          </div>

          {contests.length === 0 ? (
            <div className="bg-[#141a2b]/80 border border-white/10 rounded-3xl p-12 text-center shadow-xl backdrop-blur-xl">
              <div className="w-16 h-16 bg-pink-500/10 text-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl border border-pink-500/20">
                📝
              </div>
              <h3 className="text-lg font-bold text-white mb-1">No Contests Found</h3>
              <p className="text-slate-400 text-sm mb-6">Create your first exam contest to get started.</p>
              <button
                onClick={startNewContest}
                className="px-6 py-3 bg-gradient-to-r from-pink-600 via-rose-600 to-amber-700 hover:from-pink-500 hover:to-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-pink-600/20 transition-all text-sm"
              >
                + Create New Contest
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contests.map((contest) => (
                <div key={contest.id} className="bg-[#141a2b]/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl hover:border-pink-500/40 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="text-lg font-bold text-white leading-snug">{contest.title}</h3>
                      <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-xl shrink-0 border border-amber-500/20">
                        {contest.questionCount} Qs
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">SSC CGL (+2 / -0.5)</span>
                    <button
                      onClick={() => editExistingContest(contest)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <span>✏️</span>
                      <span>Edit Contest</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {contests.length > 0 && (
            <div className="pt-4 flex justify-center">
              <button
                onClick={startNewContest}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-pink-600 via-rose-600 to-amber-700 hover:from-pink-500 hover:to-amber-600 text-white font-bold rounded-2xl shadow-xl shadow-pink-600/20 transition-all flex items-center justify-center gap-2 text-base"
              >
                <span className="text-xl">+</span>
                <span>Create New Contest</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: CONTEST EDITOR / BUILDER FORM */}
      {viewMode === 'editor' && (
        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex items-center justify-between bg-[#141a2b]/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
            <div>
              <button
                onClick={() => setViewMode('list')}
                className="text-xs font-bold text-pink-400 hover:text-pink-300 mb-2 flex items-center gap-1"
              >
                ← Back to Contests List
              </button>
              <h2 className="text-xl font-bold text-white">
                {editingContestId ? 'Edit Contest' : 'Create New Contest'}
              </h2>
            </div>
            <button
              onClick={() => setViewMode('list')}
              className="px-4 py-2 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white text-xs font-semibold rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>

          {/* Contest Title */}
          <div className="bg-[#141a2b]/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">Contest Title</label>
            <input
              type="text"
              value={contestTitle}
              onChange={(e) => setContestTitle(e.target.value)}
              placeholder="e.g. SSC CGL Tier-1 Full Mock Test 2026"
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-all text-sm font-medium"
            />
          </div>

          {/* Question Add / Edit Form */}
          <div className="bg-[#141a2b]/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span>{editingQuestionIdx !== null ? `Edit Question #${editingQuestionIdx + 1}` : 'Add Question'}</span>
              {editingQuestionIdx !== null && (
                <button
                  onClick={resetQuestionForm}
                  className="text-xs text-pink-400 hover:underline font-normal"
                >
                  Cancel editing question
                </button>
              )}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">Question Text</label>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter question text here..."
                  rows={3}
                  className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-all text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">Answer Options</label>
                <div className="space-y-2.5">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCorrectIndex(idx)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          correctIndex === idx
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-400 font-bold'
                            : 'border-slate-600 hover:border-slate-400 text-slate-400'
                        }`}
                        title="Click to mark as correct answer"
                      >
                        {String.fromCharCode(65 + idx)}
                      </button>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(idx, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className={`flex-1 px-4 py-2.5 border rounded-xl text-sm transition-all ${
                          correctIndex === idx
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-semibold'
                            : 'bg-white/5 border-white/10 text-white placeholder-slate-500'
                        }`}
                      />
                      {options.length > 2 && (
                        <button
                          onClick={() => removeOption(idx)}
                          className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={addOption}
                    className="text-xs text-pink-400 hover:text-pink-300 font-bold flex items-center gap-1"
                  >
                    + Add Choice Option
                  </button>
                  <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    Correct Choice: {String.fromCharCode(65 + correctIndex)}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={saveQuestionToDraft}
                  className="px-6 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold rounded-xl text-sm transition-all shadow-md"
                >
                  {editingQuestionIdx !== null ? '✓ Update Question in Draft' : '+ Save Question to Draft'}
                </button>
                <button
                  onClick={() => setShowBank(!showBank)}
                  className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold rounded-xl text-sm transition-all border border-white/10"
                >
                  {showBank ? 'Hide Question Bank' : '📚 Import from Question Bank'}
                </button>
              </div>
            </div>
          </div>

          {/* Question Bank Accordion */}
          {showBank && (
            <div className="bg-[#141a2b]/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl animate-[slideUp_0.3s_ease-out]">
              <h3 className="text-lg font-bold text-white mb-3">Question Bank Repository</h3>
              <input
                type="text"
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                placeholder="Search repository questions..."
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm mb-4 focus:outline-none focus:border-pink-500"
              />
              {filteredBank.length === 0 ? (
                <p className="text-slate-400 text-sm">No matching questions found in repository.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {filteredBank.map((q) => (
                    <div key={q.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-white text-sm font-medium truncate flex-1 pr-4">{q.questionText}</p>
                      <button
                        onClick={() => addFromBank(q)}
                        className="text-xs bg-pink-500/20 text-pink-300 hover:bg-pink-500/30 font-bold px-3 py-1.5 rounded-lg shrink-0 border border-pink-500/30"
                      >
                        + Add to Draft
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Current Draft Questions List */}
          <div className="bg-[#141a2b]/80 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span>Contest Questions List ({draftQuestions.length})</span>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                Total Marks: {draftQuestions.length * 2} pts
              </span>
            </h3>

            {draftQuestions.length === 0 ? (
              <p className="text-slate-400 text-sm py-6 text-center border-2 border-dashed border-white/10 rounded-2xl">
                No questions added to this contest yet. Use the form above to add questions.
              </p>
            ) : (
              <div className="space-y-3">
                {draftQuestions.map((q, idx) => (
                  <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="w-7 h-7 bg-pink-500/20 text-pink-300 font-bold rounded-lg flex items-center justify-center text-xs shrink-0 mt-0.5 border border-pink-500/30">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold leading-snug">{q.questionText}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {q.options.map((opt, oi) => (
                            <span
                              key={oi}
                              className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${
                                oi === q.correctOptionIndex
                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                                  : 'bg-white/5 border-white/10 text-slate-300'
                              }`}
                            >
                              {String.fromCharCode(65 + oi)}: {opt}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startEditQuestionInDraft(idx)}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-pink-300 text-xs font-bold rounded-xl transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeDraftQuestion(idx)}
                        className="px-2 py-1.5 text-slate-400 hover:text-rose-400 text-xs font-bold transition-colors"
                        title="Delete question"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={saveFinalContest}
              disabled={saving}
              className="mt-6 w-full py-4 bg-gradient-to-r from-pink-600 via-rose-600 to-amber-700 hover:from-pink-500 hover:to-amber-600 text-white font-bold rounded-2xl shadow-xl shadow-pink-600/20 transition-all text-base disabled:opacity-50"
            >
              {saving ? 'Saving Contest...' : editingContestId ? '💾 Update Contest' : '💾 Save & Publish Contest'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
