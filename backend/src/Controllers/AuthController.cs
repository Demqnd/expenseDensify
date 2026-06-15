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

        var appRole = await dbContext.Roles.FirstOrDefaultAsync(r =>
            r.Name.ToLower() == user.Role.ToLower());
        var token = jwtTokenService.CreateToken(user, appRole?.CanInviteUsers ?? false, appRole?.CanChangeRoles ?? false);
        return Ok(new AuthResponse { Token = token, Email = user.Email, Role = user.Role, CanInviteUsers = appRole?.CanInviteUsers ?? false, CanChangeRoles = appRole?.CanChangeRoles ?? false });
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

        var appRole = await dbContext.Roles.FirstOrDefaultAsync(r =>
            r.Name.ToLower() == user.Role.ToLower());
        var token = jwtTokenService.CreateToken(user, appRole?.CanInviteUsers ?? false, appRole?.CanChangeRoles ?? false);
        return Ok(new AuthResponse { Token = token, Email = user.Email, Role = user.Role, CanInviteUsers = appRole?.CanInviteUsers ?? false, CanChangeRoles = appRole?.CanChangeRoles ?? false });
    }

    [HttpPost("users/role")]
    [Authorize]
    public async Task<IActionResult> UpdateUserRole(UpdateUserRoleRequest request)
    {
        if (!HasPermission("CanChangeRoles"))
            return Forbid();
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var normalizedRole = await NormalizeRoleAsync(request.Role);
        if (normalizedRole is null)
        {
            return BadRequest(new { message = "Invalid role." });
        }

        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user is null)
        {
            return NotFound(new { message = "User not found." });
        }

        user.Role = normalizedRole;
        await dbContext.SaveChangesAsync();

        return Ok(new { message = $"Role updated to {user.Role} for {user.Email}." });
    }

    [HttpGet("users")]
    [Authorize]
    public async Task<IActionResult> GetUsers()
    {
        if (!HasPermission("CanInviteUsers") && !HasPermission("CanChangeRoles"))
            return Forbid();
        var users = await dbContext.Users
            .OrderBy(user => user.Email)
            .Select(user => new
            {
                user.Id,
                user.Email,
                user.Role,
                user.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPost("admin/invite")]
    [Authorize]
    public async Task<IActionResult> InviteUser(InviteUserRequest request)
    {
        if (!HasPermission("CanInviteUsers"))
            return Forbid();
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var normalizedRole = await NormalizeRoleAsync(request.Role);
        if (normalizedRole is null)
        {
            return BadRequest(new { message = "Invalid role." });
        }

        var emailInUse = await dbContext.Users.AnyAsync(u => u.Email == normalizedEmail);
        if (emailInUse)
        {
            return Conflict(new { message = "Email is already registered." });
        }

        var resetCode = GenerateSixDigitCode();
        var user = new User
        {
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N") + "!A1"),
            Role = normalizedRole,
            PasswordResetCodeHash = BCrypt.Net.BCrypt.HashPassword(resetCode),
            PasswordResetCodeExpiresUtc = DateTime.UtcNow.AddMinutes(15)
        };

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        try
        {
            await emailSender.SendAdminInviteAsync(user.Email, resetCode, user.Role);
            logger.LogInformation("Admin invite email sent to {Email}", user.Email);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send admin invite email to {Email}", user.Email);
            return StatusCode(500, new { message = "User created but invite email failed to send." });
        }

        return Ok(new { message = $"Invite sent to {user.Email}." });
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

            return NotFound(new { message = "Email not found." });
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

    private bool HasPermission(string claimType) =>
        User.Claims.FirstOrDefault(c => c.Type == claimType)?.Value == "true";

    private async Task<string?> NormalizeRoleAsync(string inputRole)
    {
        var trimmed = inputRole.Trim();
        var match = await dbContext.Roles.FirstOrDefaultAsync(r =>
            r.Name.ToLower() == trimmed.ToLower());
        return match?.Name;
    }
}
