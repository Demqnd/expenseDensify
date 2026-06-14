using expenseKubex.Models;

namespace expenseKubex.Services;

public interface IJwtTokenService
{
    string CreateToken(User user);
}
