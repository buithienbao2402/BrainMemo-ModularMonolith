using BrainMemo.Identity.Application.DTOs;
using BrainMemo.Identity.Application.Interfaces;
using BrainMemo.Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Identity.Application.Services;

public class AuthService : IAuthService
{
    private readonly IIdentityDbContext _context; // Đổi thành IIdentityDbContext
    private readonly IPasswordHasher _hasher;
    private readonly IJwtTokenService _tokenService;
    private readonly IEmailService _emailService;

    public AuthService(
        IIdentityDbContext context, // Đổi tham số nhận vào thành IIdentityDbContext
        IPasswordHasher hasher,
        IJwtTokenService tokenService,
        IEmailService emailService)
    {
        _context = context;
        _hasher = hasher;
        _tokenService = tokenService;
        _emailService = emailService;
    }

    // US-01: Gửi mã OTP xác thực email trước khi tạo tài khoản
    public async Task<(bool Success, string Message)> RegisterAsync(RegisterRequestDto request)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        // 1. Kiểm tra trùng lặp email
        var exists = await _context.Users.AnyAsync(u => u.Email == email);
        if (exists)
            return (false, "Email này đã được sử dụng trong hệ thống.");

        // 2. Sinh mã OTP 6 chữ số ngẫu nhiên
        var otpCode = Random.Shared.Next(100000, 999999).ToString();

        // Vô hiệu hóa các mã OTP cũ chưa dùng của email này
        var oldOtps = await _context.EmailOtps.Where(o => o.Email == email && !o.IsUsed).ToListAsync();
        foreach (var otp in oldOtps) otp.IsUsed = true;

        // Lưu bản ghi OTP mới (hạn 5 phút)
        var emailOtp = new EmailOtp
        {
            Email = email,
            OtpCode = otpCode,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            IsUsed = false
        };
        _context.EmailOtps.Add(emailOtp);

        // Tạo tài khoản tạm thời (chờ kích hoạt)
        var user = new User
        {
            Email = email,
            PasswordHash = _hasher.HashPassword(request.Password),
            FullName = request.FullName,
            IsActive = false
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Gán Role
        _context.UserRoles.Add(new UserRole
        {
            UserId = user.UserId,
            Role = request.Role
        });

        await _context.SaveChangesAsync();

        // Gửi OTP qua Email
        await _emailService.SendOtpEmailAsync(email, otpCode);

        return (true, "Mã OTP đã được gửi đến email của bạn. Vui lòng xác thực trong vòng 5 phút.");
    }

    // US-01: Xác nhận OTP và kích hoạt tài khoản
    public async Task<(bool Success, string Message)> VerifyOtpAndActivateAsync(VerifyOtpRequestDto request)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var otpRecord = await _context.EmailOtps
            .Where(o => o.Email == email && o.OtpCode == request.OtpCode && !o.IsUsed)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (otpRecord == null || otpRecord.ExpiresAt < DateTime.UtcNow)
            return (false, "Mã OTP không chính xác hoặc đã hết hạn.");

        otpRecord.IsUsed = true;

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
            return (false, "Không tìm thấy thông tin tài khoản.");

        user.IsActive = true;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return (true, "Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.");
    }

    // US-02: Đăng nhập, kiểm tra mật khẩu & sinh cặp Token
    public async Task<(bool Success, string Message, AuthResponseDto? Response, string? RawRefreshToken)> LoginAsync(LoginRequestDto request)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var user = await _context.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Email == email);

        if (user == null || !_hasher.VerifyPassword(request.Password, user.PasswordHash))
            return (false, "Email hoặc mật khẩu không chính xác.", null, null);

        if (!user.IsActive)
            return (false, "Tài khoản chưa được kích hoạt OTP. Vui lòng xác thực email.", null, null);

        var primaryRole = user.UserRoles.FirstOrDefault()?.Role.ToString() ?? "STUDENT";

        // Cấp phát JWT Access Token (30 phút)
        var accessToken = _tokenService.GenerateAccessToken(user, primaryRole);

        // Sinh Refresh Token (64-byte CSPRNG) & băm SHA-256
        var rawRefreshToken = _tokenService.GenerateRefreshToken();
        var tokenHash = _tokenService.HashToken(rawRefreshToken);

        var refreshTokenEntity = new RefreshToken
        {
            UserId = user.UserId,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddDays(7), // Hạn 7 ngày
            IsRevoked = false
        };
        _context.RefreshTokens.Add(refreshTokenEntity);
        await _context.SaveChangesAsync();

        var responseDto = new AuthResponseDto
        {
            AccessToken = accessToken,
            ExpiresIn = 1800,
            User = new UserProfileDto
            {
                UserId = user.UserId,
                Email = user.Email,
                FullName = user.FullName,
                Role = primaryRole,
                AvatarMediaId = user.AvatarMediaId,
                Bio = user.Bio
            }
        };

        return (true, "Đăng nhập thành công.", responseDto, rawRefreshToken);
    }

    // US-03: Token Rotation & Chống Replay Attack
    public async Task<(bool Success, string Message, AuthResponseDto? Response, string? NewRawRefreshToken)> RefreshTokenAsync(string rawRefreshToken)
    {
        var tokenHash = _tokenService.HashToken(rawRefreshToken);

        var storedToken = await _context.RefreshTokens
            .Include(t => t.User)
            .ThenInclude(u => u!.UserRoles)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

        if (storedToken == null)
            return (false, "Refresh token không tồn tại.", null, null);

        // Phát hiện Replay Attack: Token cũ đã bị thu hồi mà vẫn gửi lại
        if (storedToken.IsRevoked)
        {
            // Thu hồi toàn bộ các phiên của User để bảo vệ
            var allUserTokens = await _context.RefreshTokens.Where(t => t.UserId == storedToken.UserId).ToListAsync();
            foreach (var t in allUserTokens) t.IsRevoked = true;
            await _context.SaveChangesAsync();

            return (false, "Cảnh báo bảo mật: Token đã qua sử dụng! Tất cả các phiên đã bị thu hồi.", null, null);
        }

        if (storedToken.ExpiresAt < DateTime.UtcNow)
            return (false, "Refresh token đã hết hạn. Vui lòng đăng nhập lại.", null, null);

        var user = storedToken.User!;
        var primaryRole = user.UserRoles.FirstOrDefault()?.Role.ToString() ?? "STUDENT";

        // Vô hiệu hóa token cũ
        storedToken.IsRevoked = true;

        // Cấp cặp Token mới
        var newAccessToken = _tokenService.GenerateAccessToken(user, primaryRole);
        var newRawRefreshToken = _tokenService.GenerateRefreshToken();
        var newTokenHash = _tokenService.HashToken(newRawRefreshToken);

        var newToken = new RefreshToken
        {
            UserId = user.UserId,
            TokenHash = newTokenHash,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsRevoked = false
        };
        _context.RefreshTokens.Add(newToken);
        await _context.SaveChangesAsync();

        // Ghi nhận liên kết token thay thế
        storedToken.ReplacedByTokenId = newToken.TokenId;
        await _context.SaveChangesAsync();

        var responseDto = new AuthResponseDto
        {
            AccessToken = newAccessToken,
            ExpiresIn = 1800,
            User = new UserProfileDto
            {
                UserId = user.UserId,
                Email = user.Email,
                FullName = user.FullName,
                Role = primaryRole,
                AvatarMediaId = user.AvatarMediaId,
                Bio = user.Bio
            }
        };

        return (true, "Làm mới phiên thành công.", responseDto, newRawRefreshToken);
    }

    public async Task RevokeTokenAsync(string rawRefreshToken)
    {
        var tokenHash = _tokenService.HashToken(rawRefreshToken);
        var storedToken = await _context.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash);
        if (storedToken != null)
        {
            storedToken.IsRevoked = true;
            await _context.SaveChangesAsync();
        }
    }
}