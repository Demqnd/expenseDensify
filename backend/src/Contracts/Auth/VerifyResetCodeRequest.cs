using System.ComponentModel.DataAnnotations;

namespace expenseKubex.Contracts.Auth;

public class VerifyResetCodeRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    [MaxLength(20)]
    public string Code { get; set; } = string.Empty;
}