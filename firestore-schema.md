# Firestore Schema — Akkiyu School of Technology

## Collections

### `users`
- **Document ID**: Firebase Auth UID
- **Fields**:
  - `uid` (string) — Firebase Auth UID
  - `email` (string) — User's email
  - `role` (string) — `"admin"` or `"student"`

### `question_bank`
- **Document ID**: Auto-generated
- **Fields**:
  - `questionText` (string) — The question
  - `options` (array of strings) — Answer choices
  - `correctOptionIndex` (number) — Index of the correct option
  - `createdAt` (timestamp) — When the question was created

### `contests`
- **Document ID**: Auto-generated
- **Fields**:
  - `title` (string) — Contest/exam name
  - `questions` (array of objects) — Each object has `questionText`, `options[]`, `correctOptionIndex`
  - `questionCount` (number) — Total number of questions
  - `createdAt` (timestamp) — When the contest was created

### `live_state`
- **Document ID**: `current` (single document)
- **Fields**:
  - `isLive` (boolean) — Whether a contest is currently active
  - `activeContestId` (string | null) — ID of the active contest

### `draft_answers`
- **Document ID**: `{contestId}__{studentId}` (double underscore separator)
- **Fields**:
  - `contestId` (string) — Active contest ID
  - `studentId` (string) — Student's Firebase Auth UID
  - `answers` (array of number | null) — Selected option index per question
  - `markedForReview` (array of boolean) — Review flag per question
  - `currentQuestionIndex` (number) — Which question the student is currently viewing
  - `lastUpdated` (timestamp) — Server timestamp of last interaction

### `submissions`
- **Document ID**: Auto-generated
- **Fields**:
  - `contestId` (string) — Contest ID
  - `studentId` (string) — Student's Firebase Auth UID
  - `answers` (array of number | null) — Final answers
  - `totalScore` (number) — Calculated score
  - `maxScore` (number) — Total possible score
  - `timestamp` (timestamp) — When submitted
