using System.ComponentModel.DataAnnotations;
using expenseKubex.Models;

namespace expenseKubex.Contracts.Auth;

public class InviteUserRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string Role { get; set; } = UserRoles.Employee;
}