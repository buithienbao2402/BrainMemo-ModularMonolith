using BrainMemo.Identity.Application.DTOs;
using BrainMemo.Identity.Domain.Entities;

namespace BrainMemo.Identity.Application.Interfaces;

public interface IPasswordHasher
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
}

public interface IJwtTokenService
{
    string GenerateAccessToken(User user, string role);
    string GenerateRefreshToken();
    string HashToken(string rawToken);
}

public interface IEmailService
{
    Task SendOtpEmailAsync(string email, string otpCode);
}

public interface IAuthService
{
    Task<(bool Success, string Message)> RegisterAsync(RegisterRequestDto request);
    Task<(bool Success, string Message)> VerifyOtpAndActivateAsync(VerifyOtpRequestDto request);
    Task<(bool Success, string Message, AuthResponseDto? Response, string? RawRefreshToken)> LoginAsync(LoginRequestDto request);
    Task<(bool Success, string Message, AuthResponseDto? Response, string? NewRawRefreshToken)> RefreshTokenAsync(string rawRefreshToken);
    Task RevokeTokenAsync(string rawRefreshToken);
}