using System.ComponentModel.DataAnnotations;

namespace expenseKubex.Contracts.Expenses;

public class CreateExpenseRequest
{
    [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
    public decimal Amount { get; set; }

    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Note { get; set; }

    public DateTime ExpenseDateUtc { get; set; }
}
