using expenseKubex.Models;

namespace expenseKubex.Services;

public interface IJwtTokenService
{
    string CreateToken(User user, bool canInviteUsers = false, bool canChangeRoles = false);
}
