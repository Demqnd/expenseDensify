namespace expenseKubex.Contracts.Expenses;

public class TeamExpenseResponse : ExpenseResponse
{
    public Guid UserId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
}