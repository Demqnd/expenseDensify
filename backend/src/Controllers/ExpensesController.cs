using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using expenseDensify.Contracts.Expenses;
using expenseDensify.Data;
using expenseDensify.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace expenseDensify.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExpensesController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ExpenseResponse>>> GetMyExpenses()
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var expenses = await dbContext.Expenses
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.ExpenseDateUtc)
            .ThenByDescending(e => e.CreatedAtUtc)
            .Select(e => ToResponse(e))
            .ToListAsync();

        return Ok(expenses);
    }

    [HttpPost]
    public async Task<ActionResult<ExpenseResponse>> CreateExpense(CreateExpenseRequest request)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var expense = new Expense
        {
            UserId = userId,
            Amount = request.Amount,
            Category = request.Category.Trim(),
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
            ExpenseDateUtc = request.ExpenseDateUtc,
            CreatedAtUtc = DateTime.UtcNow
        };

        dbContext.Expenses.Add(expense);
        await dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetExpenseById), new { id = expense.Id }, ToResponse(expense));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ExpenseResponse>> GetExpenseById(Guid id)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var expense = await dbContext.Expenses
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);

        if (expense is null)
        {
            return NotFound();
        }

        return Ok(ToResponse(expense));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ExpenseResponse>> UpdateExpense(Guid id, UpdateExpenseRequest request)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var expense = await dbContext.Expenses
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);

        if (expense is null)
        {
            return NotFound();
        }

        expense.Amount = request.Amount;
        expense.Category = request.Category.Trim();
        expense.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        expense.ExpenseDateUtc = request.ExpenseDateUtc;

        await dbContext.SaveChangesAsync();

        return Ok(ToResponse(expense));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteExpense(Guid id)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var expense = await dbContext.Expenses
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);

        if (expense is null)
        {
            return NotFound();
        }

        dbContext.Expenses.Remove(expense);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;

        var subject = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(subject, out userId);
    }

    private static ExpenseResponse ToResponse(Expense expense)
    {
        return new ExpenseResponse
        {
            Id = expense.Id,
            Amount = expense.Amount,
            Category = expense.Category,
            Note = expense.Note,
            ExpenseDateUtc = expense.ExpenseDateUtc,
            CreatedAtUtc = expense.CreatedAtUtc
        };
    }
}
