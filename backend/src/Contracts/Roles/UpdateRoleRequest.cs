namespace expenseKubex.Contracts.Roles;

public record UpdateRoleRequest(string Name, string? Description, bool CanInviteUsers, bool CanChangeRoles);
