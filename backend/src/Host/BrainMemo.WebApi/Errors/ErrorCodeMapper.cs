using System.Collections.Frozen;
using BrainMemo.SharedKernel.Results;
using Microsoft.AspNetCore.Http;

namespace BrainMemo.WebApi.Errors;

/// <summary>
/// Maps canonical domain/contract error codes (contracts/README.md §3) to HTTP status codes and Vietnamese messages.
/// </summary>
public static class ErrorCodeMapper
{
    public const string InternalServerErrorCode = "INTERNAL_SERVER_ERROR";

    private static readonly FrozenDictionary<string, (int StatusCode, string DefaultTitle)> Map =
        new Dictionary<string, (int StatusCode, string DefaultTitle)>(StringComparer.Ordinal)
        {
            [ErrorCodes.ValidationFailed] = (StatusCodes.Status422UnprocessableEntity, "Dữ liệu đầu vào không hợp lệ."),
            [ErrorCodes.MalformedRequest] = (StatusCodes.Status400BadRequest, "Yêu cầu không đúng định dạng."),
            [ErrorCodes.Unauthenticated] = (StatusCodes.Status401Unauthorized, "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn."),
            [ErrorCodes.InvalidCredentials] = (StatusCodes.Status401Unauthorized, "Email hoặc mật khẩu không chính xác."),
            [ErrorCodes.TokenInvalidOrExpired] = (StatusCodes.Status400BadRequest, "Liên kết hoặc mã xác thực không hợp lệ hoặc đã hết hạn."),
            [ErrorCodes.AccountLocked] = (StatusCodes.Status403Forbidden, "Tài khoản của bạn đang bị khóa."),
            [ErrorCodes.EmailNotVerified] = (StatusCodes.Status403Forbidden, "Vui lòng xác minh email trước khi thực hiện thao tác này."),
            [ErrorCodes.Forbidden] = (StatusCodes.Status403Forbidden, "Bạn không có quyền thực hiện thao tác này."),
            [ErrorCodes.NotEnrolled] = (StatusCodes.Status403Forbidden, "Bạn chưa ghi danh vào khóa học này."),
            [ErrorCodes.PasscodeRequired] = (StatusCodes.Status403Forbidden, "Chương học này yêu cầu mã truy cập."),
            [ErrorCodes.NotFound] = (StatusCodes.Status404NotFound, "Không tìm thấy tài nguyên được yêu cầu."),
            [ErrorCodes.EmailTaken] = (StatusCodes.Status409Conflict, "Địa chỉ email đã được sử dụng."),
            [ErrorCodes.DuplicateReport] = (StatusCodes.Status409Conflict, "Bạn đã báo cáo nội dung này trước đó."),
            [ErrorCodes.AlreadySubmitted] = (StatusCodes.Status409Conflict, "Bài làm đã được nộp trước đó."),
            [ErrorCodes.AlreadyHidden] = (StatusCodes.Status409Conflict, "Nội dung đã ở trạng thái tạm ẩn."),
            [ErrorCodes.AlreadyLocked] = (StatusCodes.Status409Conflict, "Tài khoản đã ở trạng thái khóa."),
            [ErrorCodes.ResourceInUse] = (StatusCodes.Status409Conflict, "Tài nguyên đang được sử dụng và không thể xóa."),
            [ErrorCodes.VersionConflict] = (StatusCodes.Status409Conflict, "Dữ liệu đã được cập nhật bởi phiên khác. Vui lòng tải lại trang."),
            [ErrorCodes.InvalidState] = (StatusCodes.Status409Conflict, "Trạng thái hiện tại không cho phép thực hiện thao tác này."),
            [ErrorCodes.LastAdmin] = (StatusCodes.Status409Conflict, "Không thể thu hồi hoặc khóa quản trị viên cuối cùng của hệ thống."),
            [ErrorCodes.SelfLock] = (StatusCodes.Status409Conflict, "Bạn không thể tự khóa tài khoản của chính mình."),
            [ErrorCodes.OnlyMeNotAllowed] = (StatusCodes.Status409Conflict, "Không thể thực hiện thao tác này với chế độ Chỉ mình tôi."),
            [ErrorCodes.ChapterPublishBlocked] = (StatusCodes.Status422UnprocessableEntity, "Chương học chưa đủ điều kiện để đăng tải."),
            [ErrorCodes.QuizNotOpen] = (StatusCodes.Status409Conflict, "Bài kiểm tra chưa đến thời gian mở."),
            [ErrorCodes.QuizClosed] = (StatusCodes.Status409Conflict, "Bài kiểm tra đã đóng."),
            [ErrorCodes.AttemptLimitReached] = (StatusCodes.Status409Conflict, "Bạn đã sử dụng hết số lần làm bài cho phép."),
            [ErrorCodes.QuizPasswordInvalid] = (StatusCodes.Status409Conflict, "Mật khẩu bài kiểm tra không chính xác."),
            [ErrorCodes.PrerequisiteNotMet] = (StatusCodes.Status409Conflict, "Bạn cần hoàn thành điều kiện tiên quyết trước khi tiếp tục."),
            [ErrorCodes.NotEnoughQuestions] = (StatusCodes.Status409Conflict, "Ngân hàng câu hỏi không đủ câu hỏi phù hợp để bốc đề."),
            [ErrorCodes.DeadlinePassed] = (StatusCodes.Status409Conflict, "Đã quá thời hạn làm bài hoặc nộp bài."),
            [ErrorCodes.FileTooLarge] = (StatusCodes.Status422UnprocessableEntity, "Kích thước tệp vượt quá giới hạn cho phép."),
            [ErrorCodes.FileTypeNotAllowed] = (StatusCodes.Status422UnprocessableEntity, "Định dạng tệp không được hỗ trợ."),
            [ErrorCodes.RateLimited] = (StatusCodes.Status429TooManyRequests, "Bạn thao tác quá nhanh. Vui lòng thử lại sau."),
            [ErrorCodes.AiQuotaExceeded] = (StatusCodes.Status429TooManyRequests, "Bạn đã hết lượt sử dụng AI trong ngày hôm nay."),
            [ErrorCodes.AiUnavailable] = (StatusCodes.Status503ServiceUnavailable, "Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau."),
            [InternalServerErrorCode] = (StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."),
        }.ToFrozenDictionary(StringComparer.Ordinal);

    public static (int StatusCode, string Title) Resolve(string? code, string? customMessage = null)
    {
        if (!string.IsNullOrWhiteSpace(code) && Map.TryGetValue(code, out (int StatusCode, string DefaultTitle) mapped))
        {
            string title = string.IsNullOrWhiteSpace(customMessage) ? mapped.DefaultTitle : customMessage;
            return (mapped.StatusCode, title);
        }

        string fallbackTitle = string.IsNullOrWhiteSpace(customMessage)
            ? Map[InternalServerErrorCode].DefaultTitle
            : customMessage;

        return (StatusCodes.Status500InternalServerError, fallbackTitle);
    }

    public static bool TryGetStatusCode(string code, out int statusCode)
    {
        if (Map.TryGetValue(code, out (int StatusCode, string DefaultTitle) mapped))
        {
            statusCode = mapped.StatusCode;
            return true;
        }

        statusCode = StatusCodes.Status500InternalServerError;
        return false;
    }
}

