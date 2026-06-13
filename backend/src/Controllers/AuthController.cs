using expenseDensify.Contracts.Auth;
using expenseDensify.Data;
using expenseDensify.Models;
using expenseDensify.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace expenseDensify.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AppDbContext dbContext, IJwtTokenService jwtTokenService) : ControllerBase
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
}
