using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using expenseKubex.Contracts.Expenses;
using expenseKubex.Data;
using expenseKubex.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace expenseKubex.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExpensesController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet("team/submitted")]
    [Authorize(Roles = "Manager,Hr,Finance,Admin")]
    public async Task<ActionResult<IEnumerable<TeamExpenseResponse>>> GetTeamSubmittedExpenses()
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var expenses = await dbContext.Expenses
            .Where(e => e.UserId != userId && e.Status == Expense.SubmittedStatus)
            .OrderByDescending(e => e.ExpenseDateUtc)
            .ThenByDescending(e => e.CreatedAtUtc)
            .Select(e => new TeamExpenseResponse
            {
                Id = e.Id,
                UserId = e.UserId,
                UserEmail = e.User != null ? e.User.Email : string.Empty,
                Amount = e.Amount,
                Category = e.Category,
                Note = e.Note,
                Status = e.Status,
                ReviewedAtUtc = e.ReviewedAtUtc,
                ReviewedByUserId = e.ReviewedByUserId,
                ReviewComment = e.ReviewComment,
                ExpenseDateUtc = e.ExpenseDateUtc,
                CreatedAtUtc = e.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(expenses);
    }

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
            CreatedAtUtc = DateTime.UtcNow,
            Status = Expense.DraftStatus
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

        if (expense.Status != Expense.DraftStatus)
        {
            return Conflict(new { message = "Only draft expenses can be edited." });
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

        if (expense.Status != Expense.DraftStatus)
        {
            return Conflict(new { message = "Only draft expenses can be deleted." });
        }

        dbContext.Expenses.Remove(expense);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id:guid}/submit")]
    public async Task<ActionResult<ExpenseResponse>> SubmitExpense(Guid id)
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

        if (expense.Status == Expense.SubmittedStatus)
        {
            return Ok(ToResponse(expense));
        }

        if (expense.Status != Expense.DraftStatus)
        {
            return Conflict(new { message = "Only draft expenses can be submitted." });
        }

        expense.Status = Expense.SubmittedStatus;
        expense.ReviewedAtUtc = null;
        expense.ReviewedByUserId = null;
        expense.ReviewComment = null;
        await dbContext.SaveChangesAsync();

        return Ok(ToResponse(expense));
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = "Manager,Hr,Finance,Admin")]
    public async Task<ActionResult<ExpenseResponse>> ApproveExpense(Guid id, ReviewExpenseRequest request)
    {
        if (!TryGetUserId(out var reviewerUserId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var expense = await dbContext.Expenses
            .FirstOrDefaultAsync(e => e.Id == id);

        if (expense is null)
        {
            return NotFound();
        }

        if (expense.Status != Expense.SubmittedStatus)
        {
            return Conflict(new { message = "Only submitted expenses can be approved." });
        }

        expense.Status = Expense.ApprovedStatus;
        expense.ReviewedAtUtc = DateTime.UtcNow;
        expense.ReviewedByUserId = reviewerUserId;
        expense.ReviewComment = string.IsNullOrWhiteSpace(request.Comment) ? "Approved" : request.Comment.Trim();
        await dbContext.SaveChangesAsync();

        return Ok(ToResponse(expense));
    }

    [HttpPost("{id:guid}/reject")]
    [Authorize(Roles = "Manager,Hr,Finance,Admin")]
    public async Task<ActionResult<ExpenseResponse>> RejectExpense(Guid id, ReviewExpenseRequest request)
    {
        if (!TryGetUserId(out var reviewerUserId))
        {
            return Unauthorized(new { message = "Invalid token subject." });
        }

        var expense = await dbContext.Expenses
            .FirstOrDefaultAsync(e => e.Id == id);

        if (expense is null)
        {
            return NotFound();
        }

        if (expense.Status != Expense.SubmittedStatus)
        {
            return Conflict(new { message = "Only submitted expenses can be rejected." });
        }

        expense.Status = Expense.RejectedStatus;
        expense.ReviewedAtUtc = DateTime.UtcNow;
        expense.ReviewedByUserId = reviewerUserId;
        expense.ReviewComment = string.IsNullOrWhiteSpace(request.Comment) ? "Rejected" : request.Comment.Trim();
        await dbContext.SaveChangesAsync();

        return Ok(ToResponse(expense));
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
            Status = expense.Status,
            ReviewedAtUtc = expense.ReviewedAtUtc,
            ReviewedByUserId = expense.ReviewedByUserId,
            ReviewComment = expense.ReviewComment,
            ExpenseDateUtc = expense.ExpenseDateUtc,
            CreatedAtUtc = expense.CreatedAtUtc
        };
    }
}
