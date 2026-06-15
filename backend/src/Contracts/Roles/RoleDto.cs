namespace expenseKubex.Contracts.Roles;

public record RoleDto(int Id, string Name, string? Description, bool CanInviteUsers, bool CanChangeRoles, DateTime CreatedAtUtc);
