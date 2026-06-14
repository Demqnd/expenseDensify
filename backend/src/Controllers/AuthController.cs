using System.Security.Cryptography;
using expenseKubex.Contracts.Auth;
using expenseKubex.Data;
using expenseKubex.Models;
using expenseKubex.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace expenseKubex.Controllers;

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
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = await dbContext.Users.AnyAsync() ? UserRoles.Employee : UserRoles.Admin
        };

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        var token = jwtTokenService.CreateToken(user);
        return Ok(new AuthResponse { Token = token, Email = user.Email, Role = user.Role });
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
        return Ok(new AuthResponse { Token = token, Email = user.Email, Role = user.Role });
    }

    [HttpPost("users/role")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateUserRole(UpdateUserRoleRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var normalizedRole = request.Role.Trim();

        var allowedRoles = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            UserRoles.Employee,
            UserRoles.Manager,
            UserRoles.Hr,
            UserRoles.Finance,
            UserRoles.Admin
        };

        if (!allowedRoles.Contains(normalizedRole))
        {
            return BadRequest(new { message = "Invalid role. Allowed: Employee, Manager, Hr, Finance, Admin." });
        }

        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user is null)
        {
            return NotFound(new { message = "User not found." });
        }

        user.Role = allowedRoles.First(role => role.Equals(normalizedRole, StringComparison.OrdinalIgnoreCase));
        await dbContext.SaveChangesAsync();

        return Ok(new { message = $"Role updated to {user.Role} for {user.Email}." });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        logger.LogInformation("Forgot password requested for {Email}", normalizedEmail);

        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user is null)
        {
            logger.LogInformation("Forgot password skipped: no matching user for {Email}", normalizedEmail);
            return Ok(new { message = "If that email exists, a reset code has been sent." });
        }

        var code = GenerateSixDigitCode();
        user.PasswordResetCodeHash = BCrypt.Net.BCrypt.HashPassword(code);
        user.PasswordResetCodeExpiresUtc = DateTime.UtcNow.AddMinutes(15);

        await dbContext.SaveChangesAsync();

        try
        {
            await emailSender.SendPasswordResetCodeAsync(user.Email, code);
            logger.LogInformation("Password reset email sent to {Email}", user.Email);
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
        var user = await FindUserWithValidResetCodeAsync(request.Email, request.Code);
        if (user is null)
        {
            return BadRequest(new { message = "Invalid or expired code." });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.PasswordResetCodeHash = null;
        user.PasswordResetCodeExpiresUtc = null;

        await dbContext.SaveChangesAsync();

        return Ok(new { message = "Password reset successful." });
    }

    [HttpPost("verify-reset-code")]
    public async Task<IActionResult> VerifyResetCode(VerifyResetCodeRequest request)
    {
        var user = await FindUserWithValidResetCodeAsync(request.Email, request.Code);
        if (user is null)
        {
            return BadRequest(new { message = "Invalid or expired code." });
        }

        return Ok(new { message = "Code verified." });
    }

    private async Task<User?> FindUserWithValidResetCodeAsync(string email, string code)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var normalizedCode = code.Trim();

        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user is null ||
            string.IsNullOrWhiteSpace(user.PasswordResetCodeHash) ||
            user.PasswordResetCodeExpiresUtc is null ||
            user.PasswordResetCodeExpiresUtc <= DateTime.UtcNow ||
            !BCrypt.Net.BCrypt.Verify(normalizedCode, user.PasswordResetCodeHash))
        {
            return null;
        }

        return user;
    }

    private static string GenerateSixDigitCode()
    {
        var value = RandomNumberGenerator.GetInt32(0, 1_000_000);
        return value.ToString("D6");
    }
}
