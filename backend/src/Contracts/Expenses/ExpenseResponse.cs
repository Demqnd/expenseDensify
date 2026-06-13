namespace expenseDensify.Contracts.Expenses;

public class ExpenseResponse
{
    public Guid Id { get; set; }
    public decimal Amount { get; set; }
    public string Category { get; set; } = string.Empty;
    public string? Note { get; set; }
    public DateTime ExpenseDateUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
