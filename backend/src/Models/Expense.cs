using System.ComponentModel.DataAnnotations;

namespace expenseKubex.Models;

public class Expense
{
    public const string DraftStatus = "Draft";
    public const string SubmittedStatus = "Submitted";
    public const string ApprovedStatus = "Approved";
    public const string RejectedStatus = "Rejected";

    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public User? User { get; set; }

    public decimal Amount { get; set; }

    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Note { get; set; }

    public DateTime ExpenseDateUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    [MaxLength(20)]
    public string Status { get; set; } = DraftStatus;

    public DateTime? ReviewedAtUtc { get; set; }

    public Guid? ReviewedByUserId { get; set; }

    [MaxLength(500)]
    public string? ReviewComment { get; set; }
}
