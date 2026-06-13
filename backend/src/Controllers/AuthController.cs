using System.Security.Cryptography;
using expenseDensify.Contracts.Auth;
using expenseDensify.Data;
using expenseDensify.Models;
using expenseDensify.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace expenseDensify.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    AppDbContext dbContext,
    IJwtTokenService jwtTokenService,
    IEmailSender emailSender,
    ILogger<AuthController> logger) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var emailInUse = await dbContext.Users.AnyAsync(u => u.Email == normalizedEmail);
        if (emailInUse)
        {
            return Conflict(new { message = "Email is already registered." });
        }

        var user = new User
        {
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
        };

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        var token = jwtTokenService.CreateToken(user);
        return Ok(new AuthResponse { Token = token, Email = user.Email });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var token = jwtTokenService.CreateToken(user);
        return Ok(new AuthResponse { Token = token, Email = user.Email });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user is null)
        {
            return Ok(new { message = "If that email exists, a reset code has been sent." });
        }

        var code = GenerateSixDigitCode();
        user.PasswordResetCodeHash = BCrypt.Net.BCrypt.HashPassword(code);
        user.PasswordResetCodeExpiresUtc = DateTime.UtcNow.AddMinutes(15);

        await dbContext.SaveChangesAsync();

        try
        {
            await emailSender.SendPasswordResetCodeAsync(user.Email, code);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send password reset email to {Email}", user.Email);
            return StatusCode(500, new { message = "Failed to send reset email. Please try again." });
        }

        return Ok(new { message = "If that email exists, a reset code has been sent." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user is null ||
            string.IsNullOrWhiteSpace(user.PasswordResetCodeHash) ||
            user.PasswordResetCodeExpiresUtc is null ||
            user.PasswordResetCodeExpiresUtc <= DateTime.UtcNow ||
            !BCrypt.Net.BCrypt.Verify(request.Code.Trim(), user.PasswordResetCodeHash))
        {
            return BadRequest(new { message = "Invalid or expired code." });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.PasswordResetCodeHash = null;
        user.PasswordResetCodeExpiresUtc = null;

        await dbContext.SaveChangesAsync();

        return Ok(new { message = "Password reset successful." });
    }

    private static string GenerateSixDigitCode()
    {
        var value = RandomNumberGenerator.GetInt32(0, 1_000_000);
        return value.ToString("D6");
    }
}
