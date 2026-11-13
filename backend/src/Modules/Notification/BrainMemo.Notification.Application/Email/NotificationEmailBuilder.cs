using System.Net;
using BrainMemo.BuildingBlocks.Abstractions.Email;
using BrainMemo.Identity.Contracts;
using BrainMemo.Notification.Application.Options;

namespace BrainMemo.Notification.Application.Email;

public static class NotificationEmailBuilder
{
    public static EmailMessage BuildVerificationEmail(
        string toEmail,
        string rawToken,
        NotificationEmailOptions options)
    {
        string verifyUrl = $"{options.WebBaseUrl.TrimEnd('/')}{options.VerifyEmailPath}?token={WebUtility.UrlEncode(rawToken)}";

        string subject = "[BrainMemo] Xác minh địa chỉ email";
        string htmlBody = $@"
<!DOCTYPE html>
<html>
<head><meta charset='utf-8'></head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
    <h2>Chào mừng bạn đến với BrainMemo LMS!</h2>
    <p>Vui lòng nhấn vào liên kết bên dưới để xác minh địa chỉ email của bạn:</p>
    <p><a href='{verifyUrl}' style='display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 5px;'>Xác minh email</a></p>
    <p>Hoặc dán liên kết sau vào trình duyệt:</p>
    <p>{verifyUrl}</p>
    <p>Nếu bạn không thực hiện đăng ký tài khoản này, vui lòng bỏ qua email này.</p>
</body>
</html>";

        string textBody = $"Chào mừng bạn đến với BrainMemo LMS! Vui lòng truy cập liên kết sau để xác minh email: {verifyUrl}";

        return new EmailMessage(toEmail, subject, htmlBody, textBody);
    }

    public static EmailMessage BuildPasswordResetEmail(
        string toEmail,
        string rawToken,
        NotificationEmailOptions options)
    {
        string resetUrl = $"{options.WebBaseUrl.TrimEnd('/')}{options.ResetPasswordPath}?token={WebUtility.UrlEncode(rawToken)}";

        string subject = "[BrainMemo] Đặt lại mật khẩu tài khoản";
        string htmlBody = $@"
<!DOCTYPE html>
<html>
<head><meta charset='utf-8'></head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
    <h2>Yêu cầu đặt lại mật khẩu</h2>
    <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản BrainMemo của bạn.</p>
    <p><a href='{resetUrl}' style='display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 5px;'>Đặt lại mật khẩu</a></p>
    <p>Hoặc dán liên kết sau vào trình duyệt:</p>
    <p>{resetUrl}</p>
    <p>Nếu bạn không gửi yêu cầu này, hãy đổi mật khẩu hoặc liên hệ quản trị viên ngay.</p>
</body>
</html>";

        string textBody = $"Yêu cầu đặt lại mật khẩu tài khoản BrainMemo. Vui lòng truy cập: {resetUrl}";

        return new EmailMessage(toEmail, subject, htmlBody, textBody);
    }

    public static EmailMessage BuildAccountLockedEmail(
        string toEmail,
        LockType lockType,
        DateTimeOffset? until)
    {
        string subject = "[BrainMemo] Thông báo khóa tài khoản";
        string durationText = lockType == LockType.Temporary && until.HasValue
            ? $"Tài khoản của bạn đã bị khóa tạm thời cho đến: {until.Value:yyyy-MM-dd HH:mm:ss} UTC."
            : "Tài khoản của bạn đã bị khóa vĩnh viễn do vi phạm chính sách sử dụng.";

        string htmlBody = $@"
<!DOCTYPE html>
<html>
<head><meta charset='utf-8'></head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
    <h2>Thông báo trạng thái tài khoản</h2>
    <p>{durationText}</p>
    <p>Nếu bạn có thắc mắc, vui lòng liên hệ với đội ngũ quản trị để được hỗ trợ.</p>
</body>
</html>";

        string textBody = $"Thông báo tài khoản BrainMemo: {durationText}";

        return new EmailMessage(toEmail, subject, htmlBody, textBody);
    }
}
