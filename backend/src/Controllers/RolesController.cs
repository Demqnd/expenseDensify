using expenseKubex.Contracts.Roles;
using expenseKubex.Data;
using expenseKubex.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace expenseKubex.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RolesController(AppDbContext dbContext) : ControllerBase
{
    private bool HasPermission(string claimType) =>
        User.Claims.FirstOrDefault(c => c.Type == claimType)?.Value == "true";

    // Any authenticated user can list roles (needed for invite/user dropdowns).
    [HttpGet]
    public async Task<IActionResult> GetRoles()
    {
        var roles = await dbContext.Roles
            .OrderBy(r => r.Name)
            .Select(r => new RoleDto(r.Id, r.Name, r.Description, r.CanInviteUsers, r.CanChangeRoles, r.CreatedAtUtc))
            .ToListAsync();

        return Ok(roles);
    }

    [HttpPost]
    public async Task<IActionResult> CreateRole(CreateRoleRequest request)
    {
        if (!HasPermission("CanChangeRoles"))
            return Forbid();

        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return BadRequest(new { message = "Role name is required." });
        }

        var exists = await dbContext.Roles.AnyAsync(r => r.Name.ToLower() == name.ToLower());
        if (exists)
        {
            return Conflict(new { message = "A role with that name already exists." });
        }

        var role = new AppRole
        {
            Name = name,
            Description = request.Description?.Trim(),
            CanInviteUsers = request.CanInviteUsers,
            CanChangeRoles = request.CanChangeRoles,
            CreatedAtUtc = DateTime.UtcNow
        };

        dbContext.Roles.Add(role);
        await dbContext.SaveChangesAsync();

        return Ok(new RoleDto(role.Id, role.Name, role.Description, role.CanInviteUsers, role.CanChangeRoles, role.CreatedAtUtc));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateRole(int id, UpdateRoleRequest request)
    {
        if (!HasPermission("CanChangeRoles"))
            return Forbid();

        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            return BadRequest(new { message = "Role name is required." });
        }

        var role = await dbContext.Roles.FindAsync(id);
        if (role is null)
        {
            return NotFound(new { message = "Role not found." });
        }

        var duplicate = await dbContext.Roles.AnyAsync(r => r.Id != id && r.Name.ToLower() == name.ToLower());
        if (duplicate)
        {
            return Conflict(new { message = "A role with that name already exists." });
        }

        role.Name = name;
        role.Description = request.Description?.Trim();
        role.CanInviteUsers = request.CanInviteUsers;
        role.CanChangeRoles = request.CanChangeRoles;
        await dbContext.SaveChangesAsync();

        return Ok(new RoleDto(role.Id, role.Name, role.Description, role.CanInviteUsers, role.CanChangeRoles, role.CreatedAtUtc));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteRole(int id)
    {
        if (!HasPermission("CanChangeRoles"))
            return Forbid();

        var role = await dbContext.Roles.FindAsync(id);
        if (role is null)
        {
            return NotFound(new { message = "Role not found." });
        }

        var inUse = await dbContext.Users.AnyAsync(u => u.Role == role.Name);
        if (inUse)
        {
            return BadRequest(new { message = $"Cannot delete '{role.Name}' — it is currently assigned to one or more users." });
        }

        dbContext.Roles.Remove(role);
        await dbContext.SaveChangesAsync();

        return Ok(new { message = $"Role '{role.Name}' deleted." });
    }
}
