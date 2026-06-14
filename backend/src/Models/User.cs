using System.ComponentModel.DataAnnotations;

namespace expenseKubex.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string? PasswordResetCodeHash { get; set; }

    public DateTime? PasswordResetCodeExpiresUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
}
