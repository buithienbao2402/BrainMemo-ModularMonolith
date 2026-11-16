# Handoff Document: T-S6-BE-02 (Nominations & Learning Stats - Batched)

## 1. Overview
Implemented course nominations (FR-CRS-15, FR-CRS-16) and aggregated course statistics (FR-CRS-14) in the Course module.

## 2. Changes Made
### Domain & Persistence:
- Checked `Nomination` entity (`crs_nomination`) supporting `NominatedAt`, `WithdrawnAt`, and `IsActive` (`withdrawn_at IS NULL`).
- Added repository methods in `ICourseRepository` and `CourseRepository`:
  - `GetActiveNominationAsync(Guid courseId, Guid userId, CancellationToken ct)`
  - `AddNominationAsync(Nomination nomination, CancellationToken ct)`
  - `HasNominatedAsync(Guid courseId, Guid userId, CancellationToken ct)`
  - `GetNominationCountAsync(Guid courseId, CancellationToken ct)`
  - `GetLearnerCountAsync(Guid courseId, CancellationToken ct)`

### CQRS Commands & Handlers:
- `NominateCourseCommand`:
  - Checks course existence and non-deleted status.
  - Verifies eligibility: learner must have `EnrollmentStatus.Active` or be course owner.
  - Idempotent: if already active nomination exists, succeeds without duplication.
  - Inserts new row on re-nomination after withdrawal.
  - Emits Outbox integration event `NominationChanged` (`IsActive = true`).
- `WithdrawNominationCommand`:
  - Checks active nomination; sets `WithdrawnAt = now`.
  - Idempotent: if no active nomination, succeeds without error.
  - Emits Outbox integration event `NominationChanged` (`IsActive = false`).
- `GetNominationSummaryQuery`:
  - Returns `NominationSummaryDto(int NominationCount, bool HasNominated)`.
  - Accessible anonymously (returns `HasNominated = false`).
- `GetCourseStatsQueryHandler`:
  - Owner-only query.
  - Aggregates `ActiveLearners` (Course repo), `NominationCount` (Course repo), `ChapterCount` (`IContentContract.CountPublishedChapters`), and `CompletedLearners`, `CommentCount` (`ILearningContract.GetCourseLearningStats`).
  - Calculates `CompletionRate = activeLearners == 0 ? 0.0 : Math.Round((double)completedLearners / activeLearners * 100.0, 2)`.

### Controllers & Endpoints:
- `PUT /api/v1/courses/{courseId}/nomination`: 204 NoContent.
- `DELETE /api/v1/courses/{courseId}/nomination`: 204 NoContent.
- `GET /api/v1/courses/{courseId}/nominations/summary`: 200 OK (`NominationSummaryDto`).
- `GET /api/v1/courses/{courseId}/stats`: 200 OK (`CourseStatsDto`).

## 3. Verification & Tests
- `dotnet build backend/BrainMemo.sln`: 0 Warning(s), 0 Error(s).
- `dotnet test backend/tests/Course.UnitTests/`: 91/91 passed (100%).
- Acceptance Criteria verified:
  - Each user gets at most 1 active nomination per course.
  - Nominations preserved when leaving course ("Giữ khi rời khóa").
  - Withdrawing sets `withdrawn_at`.
  - Re-nominating inserts new record.
