using BrainMemo.SharedKernel.Results;
using BrainMemo.WebApi.Errors;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace WebApi.Tests.Errors;

public sealed class ErrorCodeMapperTests
{
    [Theory]
    [InlineData(ErrorCodes.ValidationFailed, StatusCodes.Status422UnprocessableEntity)]
    [InlineData(ErrorCodes.MalformedRequest, StatusCodes.Status400BadRequest)]
    [InlineData(ErrorCodes.Unauthenticated, StatusCodes.Status401Unauthorized)]
    [InlineData(ErrorCodes.InvalidCredentials, StatusCodes.Status401Unauthorized)]
    [InlineData(ErrorCodes.TokenInvalidOrExpired, StatusCodes.Status400BadRequest)]
    [InlineData(ErrorCodes.AccountLocked, StatusCodes.Status403Forbidden)]
    [InlineData(ErrorCodes.EmailNotVerified, StatusCodes.Status403Forbidden)]
    [InlineData(ErrorCodes.Forbidden, StatusCodes.Status403Forbidden)]
    [InlineData(ErrorCodes.NotEnrolled, StatusCodes.Status403Forbidden)]
    [InlineData(ErrorCodes.PasscodeRequired, StatusCodes.Status403Forbidden)]
    [InlineData(ErrorCodes.NotFound, StatusCodes.Status404NotFound)]
    [InlineData(ErrorCodes.EmailTaken, StatusCodes.Status409Conflict)]
    [InlineData(ErrorCodes.DuplicateReport, StatusCodes.Status409Conflict)]
    [InlineData(ErrorCodes.AlreadySubmitted, StatusCodes.Status409Conflict)]
    [InlineData(ErrorCodes.AlreadyHidden, StatusCodes.Status409Conflict)]
    [InlineData(ErrorCodes.AlreadyLocked, StatusCodes.Status409Conflict)]
    [InlineData(ErrorCodes.ResourceInUse, StatusCodes.Status409Conflict)]
    [InlineData(ErrorCodes.VersionConflict, StatusCodes.Status409Conflict)]
    [InlineData(ErrorCodes.InvalidState, StatusCodes.Status409Conflict)]
    [InlineData(ErrorCodes.LastAdmin, StatusCodes.Status409Conflict)]
    [InlineData(ErrorCodes.SelfLock, StatusCodes.Status409Conflict)]
    [InlineData(ErrorCodes.OnlyMeNotAllowed, StatusCodes.Status409Conflict)]
    [InlineData(ErrorCodes.ChapterPublishBlocked, StatusCodes.Status422UnprocessableEntity)]
    [InlineData(ErrorCodes.QuizNotOpen, StatusCodes.Status409Conflict)]
    [InlineData(ErrorCodes.QuizClosed, StatusCodes.Status409Conflict)]
    [InlineData(ErrorCodes.AttemptLimitReached, StatusCodes.Status409Conflict)]
    [InlineData(ErrorCodes.QuizPasswordInvalid, StatusCodes.Status409Conflict)]
    [InlineData(ErrorCodes.PrerequisiteNotMet, StatusCodes.Status409Conflict)]
    [InlineData(ErrorCodes.NotEnoughQuestions, StatusCodes.Status409Conflict)]
    [InlineData(ErrorCodes.DeadlinePassed, StatusCodes.Status409Conflict)]
    [InlineData(ErrorCodes.FileTooLarge, StatusCodes.Status422UnprocessableEntity)]
    [InlineData(ErrorCodes.FileTypeNotAllowed, StatusCodes.Status422UnprocessableEntity)]
    [InlineData(ErrorCodes.RateLimited, StatusCodes.Status429TooManyRequests)]
    [InlineData(ErrorCodes.AiQuotaExceeded, StatusCodes.Status429TooManyRequests)]
    [InlineData(ErrorCodes.AiUnavailable, StatusCodes.Status503ServiceUnavailable)]
    public void Resolve_MapsEveryCanonicalErrorCodeToExpectedHttpStatus(string code, int expectedStatus)
    {
        (int statusCode, string title) = ErrorCodeMapper.Resolve(code);

        Assert.Equal(expectedStatus, statusCode);
        Assert.False(string.IsNullOrWhiteSpace(title));
    }

    [Fact]
    public void Resolve_PreservesCustomMessageOrFallsBackToDefault()
    {
        (int status, string custom) = ErrorCodeMapper.Resolve(ErrorCodes.NotFound, "Khóa học không tồn tại.");
        Assert.Equal(404, status);
        Assert.Equal("Khóa học không tồn tại.", custom);

        (int unknownStatus, string fallback) = ErrorCodeMapper.Resolve("UNKNOWN_CODE");
        Assert.Equal(500, unknownStatus);
        Assert.False(string.IsNullOrWhiteSpace(fallback));
    }
}

