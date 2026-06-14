using System.ComponentModel.DataAnnotations;

namespace expenseKubex.Contracts.Auth;

public class UpdateUserRoleRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string Role { get; set; } = string.Empty;
}