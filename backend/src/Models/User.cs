using System.ComponentModel.DataAnnotations;

namespace expenseDensify.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
}
