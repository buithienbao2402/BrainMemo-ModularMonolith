using BrainMemo.Identity.Application.DTOs;
using BrainMemo.Identity.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// US-01: Đăng ký tài khoản mới & gửi mã xác thực OTP
    /// </summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
    {
        var result = await _authService.RegisterAsync(request);
        if (!result.Success)
            return Conflict(new { message = result.Message });

        return Ok(new { message = result.Message });
    }

    /// <summary>
    /// US-01: Xác thực OTP để kích hoạt tài khoản
    /// </summary>
    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequestDto request)
    {
        var result = await _authService.VerifyOtpAndActivateAsync(request);
        if (!result.Success)
            return BadRequest(new { message = result.Message });

        return Ok(new { message = result.Message });
    }

    /// <summary>
    /// US-02: Đăng nhập & Nhận JWT Access Token + HttpOnly Refresh Token
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        var result = await _authService.LoginAsync(request);
        if (!result.Success)
            return Unauthorized(new { message = result.Message });

        // Đính kèm Refresh Token vào Cookie bảo mật (HttpOnly, Secure, SameSite=Strict)
        SetRefreshTokenCookie(result.RawRefreshToken!);

        return Ok(result.Response);
    }

    /// <summary>
    /// US-03: Xoay vòng Refresh Token (Token Rotation)
    /// </summary>
    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken()
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (string.IsNullOrEmpty(refreshToken))
            return Unauthorized(new { message = "Không tìm thấy refresh token trong cookie." });

        var result = await _authService.RefreshTokenAsync(refreshToken);
        if (!result.Success)
            return Unauthorized(new { message = result.Message });

        SetRefreshTokenCookie(result.NewRawRefreshToken!);

        return Ok(result.Response);
    }

    /// <summary>
    /// US-03: Đăng xuất & Thu hồi Refresh Token
    /// </summary>
    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (!string.IsNullOrEmpty(refreshToken))
        {
            await _authService.RevokeTokenAsync(refreshToken);
        }

        Response.Cookies.Delete("refreshToken");
        return Ok(new { message = "Đăng xuất thành công." });
    }

    /// <summary>
    /// US-04: Endpoint kiểm tra phân quyền - Chỉ CREATOR mới gọi được
    /// </summary>
    [Authorize(Roles = "CREATOR")]
    [HttpGet("creator-only")]
    public IActionResult TestCreatorRole()
    {
        return Ok(new { message = "Xin chào Creator! Bạn có toàn quyền quản trị bài giảng." });
    }

    private void SetRefreshTokenCookie(string token)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = false, // Đổi thành true khi chạy HTTPS / Production
            SameSite = SameSiteMode.Strict,
            Expires = DateTime.UtcNow.AddDays(7)
        };
        Response.Cookies.Append("refreshToken", token, cookieOptions);
    }
}