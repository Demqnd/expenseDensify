namespace expenseKubex.Models;

public class AppRole
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool CanInviteUsers { get; set; }
    public bool CanChangeRoles { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
