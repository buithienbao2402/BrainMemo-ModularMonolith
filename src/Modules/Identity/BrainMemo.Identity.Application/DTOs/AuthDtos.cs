using System.ComponentModel.DataAnnotations;
using BrainMemo.Identity.Domain.Entities;

namespace BrainMemo.Identity.Application.DTOs;

public class RegisterRequestDto
{
    [Required(ErrorMessage = "Email không được để trống")]
    [EmailAddress(ErrorMessage = "Định dạng email không hợp lệ")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mật khẩu không được để trống")]
    [MinLength(8, ErrorMessage = "Mật khẩu phải có tối thiểu 8 ký tự")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Họ và tên không được để trống")]
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng chọn vai trò")]
    public UserRoleType Role { get; set; } = UserRoleType.STUDENT;
}

public class VerifyOtpRequestDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(6, MinimumLength = 6, ErrorMessage = "Mã OTP phải đúng 6 chữ số")]
    public string OtpCode { get; set; } = string.Empty;
}

public class LoginRequestDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class AuthResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public int ExpiresIn { get; set; } // Giây (1800s = 30p)
    public UserProfileDto User { get; set; } = null!;
}

public class UserProfileDto
{
    public long UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public long? AvatarMediaId { get; set; }
    public string? Bio { get; set; }
}