export interface ExamState {
  contestId: string;
  answers: (number | null)[];
  markedForReview: boolean[];
  currentQuestionIndex: number;
  lastUpdated: number;
}

const STORAGE_PREFIX = 'ast_exam_';

function getKey(contestId: string): string {
  return `${STORAGE_PREFIX}${contestId}`;
}

export function saveExamState(state: ExamState): void {
  try {
    const key = getKey(state.contestId);
    const data = { ...state, lastUpdated: Date.now() };
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // localStorage might be full or unavailable — fail silently
    console.warn('Failed to save exam state to localStorage');
  }
}

export function loadExamState(contestId: string): ExamState | null {
  try {
    const key = getKey(contestId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: ExamState = JSON.parse(raw);
    // Guard against stale data from a different contest
    if (parsed.contestId !== contestId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearExamState(contestId: string): void {
  try {
    const key = getKey(contestId);
    localStorage.removeItem(key);
  } catch {
    // fail silently
  }
}
