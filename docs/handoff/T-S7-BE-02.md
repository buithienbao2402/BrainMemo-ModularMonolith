# Handoff Document: T-S7-BE-02 (Batched: BE-03, BE-04, BE-05)

## 1. Overview
- **Task ID:** `T-S7-BE-02`
- **Module(s):** Assessment (`BrainMemo.Assessment.*`) & Learning (`BrainMemo.Learning.*`)
- **Scope Covered:**
  - `T-S7-BE-03`: Quiz Engine, password protection, exception schedule calculations, F5 recovery, and anti-leak snapshotting.
  - `T-S7-BE-04`: Assessment Module setup, `ast_grade_record` & `ast_assessment_component` persistence, grading strategies for 5 question types (`MULTIPLE_CHOICE`, `TRUE_FALSE`, `FILL_BLANK`, `MATCHING`, `ESSAY`).
  - `T-S7-BE-05`: Quiz autosave, deadline worker handling, ADR-04 Two-Phase Commit (`TX1: SUBMITTED` -> Outside TX: `IAssessmentContract.GradeQuizAttempt` -> `TX2: GRADED` & block completion).

## 2. Key Architecture Decisions & Implementation
- **Assessment Module Architecture (BE-04):**
  - Projects: `BrainMemo.Assessment.Contracts`, `BrainMemo.Assessment.Domain`, `BrainMemo.Assessment.Application`, `BrainMemo.Assessment.Infrastructure`, `BrainMemo.Assessment.Api`, `Assessment.UnitTests`.
  - Database table `ast_grade_record` with unique constraint `uk_ast_grade_source_attempt (source_attempt_id)` ensuring idempotency when grading attempts multiple times.
  - Pluggable `IGradingStrategy` implementations:
    - `MultipleChoiceGradingStrategy`: Handles single-choice and multi-choice (`allowMultiple`).
    - `TrueFalseGradingStrategy`: Boolean evaluation.
    - `FillBlankGradingStrategy`: Semi-colon separated multi-blank evaluation with partial proportional scoring.
    - `MatchingGradingStrategy`: Key-value term-definition mapping evaluation with proportional scoring.
    - `EssayGradingStrategy`: Flags `PendingManual = true` for manual teacher grading.
- **Learning Quiz Lifecycle (BE-03 & BE-05):**
  - Database tables: `lrn_quiz_attempt` and `lrn_quiz_attempt_answer`.
  - Anti-leak security: While `Status == "IN_PROGRESS"`, `isCorrect`, `Explanation`, and `ReferenceAnswer` are never returned in queries or commands.
  - F5 Recovery: When `StartQuizAttempt` is invoked while an attempt is already active and not expired, returns the active attempt instead of consuming an attempt limit.
  - Password & Exceptions: Verifies BCrypt hashed password when required; applies student exceptions (`ExtraMinutes`, `ExtraAttempts`, `ExtendedCloseAt`).
  - Autosave: `PUT /api/v1/quiz-attempts/{id}/answers/{questionId}` updates student answers with deadline checks.
  - ADR-04 Two-Phase Commit Submission:
    - **TX1:** Marks attempt as `SUBMITTED`, records `SubmittedAt = UtcNow`.
    - **Outside TX:** Calls `IAssessmentContract.GradeQuizAttempt(attemptId)`. If Assessment module throws or fails, attempt remains safely recorded as `SUBMITTED`.
    - **TX2:** On grading success, updates `TotalScore`, `GradedAt`, updates question answers with points earned, marks `BlockCompletion` if passed, and writes `QuizAttemptSubmitted` outbox event.

## 3. Endpoints Implemented
- `POST /api/v1/courses/{courseId}/quizzes/{blockId}/attempts` (Start attempt / F5 recovery)
- `GET /api/v1/courses/{courseId}/quizzes/{blockId}/attempts` (List student attempts)
- `GET /api/v1/quiz-attempts/{id}` (Get attempt detail with masked/unmasked answers)
- `PUT /api/v1/quiz-attempts/{id}/answers/{questionId}` (Autosave answer)
- `POST /api/v1/quiz-attempts/{id}/submit` (Submit and auto-grade attempt)

## 4. Verification
- `dotnet test backend/tests/Assessment.UnitTests/`: 8/8 tests passed.
- `dotnet test backend/tests/Learning.UnitTests/`: 21/21 tests passed.
- `dotnet build backend/BrainMemo.sln`: 0 Warning(s), 0 Error(s).
