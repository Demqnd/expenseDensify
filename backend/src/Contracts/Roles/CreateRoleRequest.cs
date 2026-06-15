namespace expenseKubex.Contracts.Roles;

public record CreateRoleRequest(string Name, string? Description, bool CanInviteUsers, bool CanChangeRoles);
