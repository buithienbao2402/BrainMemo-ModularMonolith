using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using BrainMemo.Identity.Application.Interfaces;
using BrainMemo.Identity.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace BrainMemo.Identity.Application.Services;

public class PasswordHasher : IPasswordHasher
{
    // workFactor = 11 theo đúng đặc tả US-01
    public string HashPassword(string password) => BCrypt.Net.BCrypt.HashPassword(password, workFactor: 11);

    public bool VerifyPassword(string password, string passwordHash) => BCrypt.Net.BCrypt.Verify(password, passwordHash);
}

public class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _config;

    public JwtTokenService(IConfiguration config)
    {
        _config = config;
    }

    public string GenerateAccessToken(User user, string role)
    {
        var secretKey = _config["Jwt:Key"] ?? "BrainMemo_Super_Secret_Key_LMS_2026_Minimum_32_Characters!";
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("fullName", user.FullName),
            new Claim(ClaimTypes.Role, role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "BrainMemoApi",
            audience: _config["Jwt:Audience"] ?? "BrainMemoClient",
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(30), // Hạn 30 phút theo US-02
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    // Băm SHA-256 lưu token_hash vào CSDL
    public string HashToken(string rawToken)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(hashedBytes);
    }
}

// Giả lập dịch vụ gửi Mail OTP (in mã ra Console terminal để test)
public class EmailService : IEmailService
{
    public Task SendOtpEmailAsync(string email, string otpCode)
    {
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine($"\n[EMAIL SERVICE] Gửi OTP xác thực tới '{email}': MÃ LÀ >>> {otpCode} <<< (Hạn 5 phút)\n");
        Console.ResetColor();
        return Task.CompletedTask;
    }
}