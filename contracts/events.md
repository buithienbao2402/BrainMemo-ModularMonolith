# Events (nguồn chuẩn – khớp THIET_KE_CSDL 4.8, đã bỏ AIGenerationCompleted)

Cơ sở: `IntegrationEvent(Guid EventId, DateTimeOffset OccurredAt)`.

| Event | Phát bởi | Payload (ngoài cơ sở) | Outbox | Người nhận |
|:--|:--|:--|:-:|:--|
| UserRegistered | Identity | UserId | – | Profile |
| EmailVerificationRequested / PasswordResetRequested | Identity | UserId, TokenId, RawToken(chỉ bộ nhớ) | – | Notification |
| AccountLocked | Identity | UserId, Type, Until?, SanctionId | – | Notification |
| AccountUnlocked | Identity | UserId, SanctionId, Kind(MANUAL\|AUTO_EXPIRED) | – | Moderation |
| ProfileUpdated | Profile | UserId, DisplayName, AvatarStorageKey? | – | Discovery |
| ReportResolved | Moderation | ReportId, Source, Decision, Reason, ReporterUserId?, ReportedUserId, Sanctions[] | – | Notification |
| SanctionApplied | Moderation | SanctionId, SubjectUserId, Type, Reason, ExpiresAt? | – | Notification |
| CourseUpserted | Course | CourseId, Revision, Eligible, ChangedFields[]; chỉ khi Eligible: OwnerUserId, Name, Description, CoverStorageKey, AccessMode, Status, Tags[], CreatedAt, UpdatedAt | ✔ | Discovery, AI |
| CoursePermanentlyDeleted | Course | CourseId, CoverStorageKey? | ✔ | Content, Learning, Assessment, Discovery, AI |
| EnrollmentChanged | Course | CourseId, OwnerUserId, UserId, Action, FromStatus, ToStatus, IsFirstActivation | ✔ | Notification, Discovery |
| NominationChanged | Course | CourseId, UserId, Action(NOMINATED\|WITHDRAWN) | ✔ | Discovery |
| ChapterPublished | Content | ChapterId, CourseId, VersionNo, IsFirstPublish, AddedBlockIds[], RemovedBlockIds[] | – | Notification, Discovery, Assessment |
| ChapterDeleted | Content | ChapterId, CourseId, WasPublished | – | Course, Learning, Discovery |
| BlockCompleted / ChapterCompleted | Learning | UserId, CourseId, ChapterId, BlockId? | – | Course, Assessment |
| CourseCompleted | Learning | UserId, CourseId | – | Course, Profile |
| QuizAttemptStarted | Learning | AttemptId, UserId, QuizBlockId, DeadlineAt | – | Assessment |
| QuizAttemptSubmitted | Learning | AttemptId, UserId, CourseId, ChapterId, BlockId, QuizBlockId, SubmittedAt, AutoSubmitted | ✔ | Learning(progress), Assessment(chấm lại) |
| AssignmentSubmitted | Learning | SubmissionId, UserId, AssignmentBlockId, SubmittedAt, IsLate | ✔ | Assessment |
| CommentCreated | Learning | CommentId, CourseId, ChapterId?, AuthorUserId, ParentCommentId?, Content | – | AI, Notification, Discovery |
| CommentDeleted | Learning | CommentId, DeletedByUserId, Reason? | – | Moderation, Discovery, Notification |
| GradeRecorded | Assessment | GradeRecordId, UserId, CourseId, ComponentId, RecordType, SourceAttemptId?, SourceSubmissionId?, Score, MaxScore, PassScorePercent?, IsPassed?, AnswersResult[], GradedAt | ✔ | Notification, Learning |
| CourseReviewCreated / Updated / Replied | Assessment | ReviewId, CourseId, UserId, Rating, ... | ✔ | Discovery, Notification |
| AIFlagRaised | AI | ScanLogId, TargetType, TargetId, Score, ThresholdUsed | – | Moderation(audit) |

Outbox: bộ phát đọc `published_at IS NULL` theo `created_at`, phát, đánh dấu; bên nhận so `Revision` (Course) và bỏ trùng theo `EventId`.