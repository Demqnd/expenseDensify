using System.ComponentModel.DataAnnotations;

namespace expenseKubex.Contracts.Expenses;

public class ReviewExpenseRequest
{
    [MaxLength(500)]
    public string? Comment { get; set; }
}
