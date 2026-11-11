namespace BrainMemo.SharedKernel.Results;

/// <summary>
/// Canonical error codes mapped to HTTP statuses in BrainMemo.WebApi (contracts/README.md §3).
/// </summary>
public static class ErrorCodes
{
    public const string ValidationFailed = "VALIDATION_FAILED";
    public const string MalformedRequest = "MALFORMED_REQUEST";
    public const string Unauthenticated = "UNAUTHENTICATED";
    public const string InvalidCredentials = "INVALID_CREDENTIALS";
    public const string TokenInvalidOrExpired = "TOKEN_INVALID_OR_EXPIRED";
    public const string AccountLocked = "ACCOUNT_LOCKED";
    public const string EmailNotVerified = "EMAIL_NOT_VERIFIED";
    public const string Forbidden = "FORBIDDEN";
    public const string NotEnrolled = "NOT_ENROLLED";
    public const string PasscodeRequired = "PASSCODE_REQUIRED";
    public const string NotFound = "NOT_FOUND";
    public const string EmailTaken = "EMAIL_TAKEN";
    public const string DuplicateReport = "DUPLICATE_REPORT";
    public const string AlreadySubmitted = "ALREADY_SUBMITTED";
    public const string AlreadyHidden = "ALREADY_HIDDEN";
    public const string AlreadyLocked = "ALREADY_LOCKED";
    public const string ResourceInUse = "RESOURCE_IN_USE";
    public const string VersionConflict = "VERSION_CONFLICT";
    public const string InvalidState = "INVALID_STATE";
    public const string LastAdmin = "LAST_ADMIN";
    public const string SelfLock = "SELF_LOCK";
    public const string OnlyMeNotAllowed = "ONLY_ME_NOT_ALLOWED";
    public const string ChapterPublishBlocked = "CHAPTER_PUBLISH_BLOCKED";
    public const string QuizNotOpen = "QUIZ_NOT_OPEN";
    public const string QuizClosed = "QUIZ_CLOSED";
    public const string AttemptLimitReached = "ATTEMPT_LIMIT_REACHED";
    public const string QuizPasswordInvalid = "QUIZ_PASSWORD_INVALID";
    public const string PrerequisiteNotMet = "PREREQUISITE_NOT_MET";
    public const string NotEnoughQuestions = "NOT_ENOUGH_QUESTIONS";
    public const string DeadlinePassed = "DEADLINE_PASSED";
    public const string FileTooLarge = "FILE_TOO_LARGE";
    public const string FileTypeNotAllowed = "FILE_TYPE_NOT_ALLOWED";
    public const string RateLimited = "RATE_LIMITED";
    public const string AiQuotaExceeded = "AI_QUOTA_EXCEEDED";
    public const string AiUnavailable = "AI_UNAVAILABLE";
}
