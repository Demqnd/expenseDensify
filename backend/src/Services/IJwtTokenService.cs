using expenseDensify.Models;

namespace expenseDensify.Services;

public interface IJwtTokenService
{
    string CreateToken(User user);
}
