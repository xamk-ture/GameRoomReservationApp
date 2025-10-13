using System.Threading.Tasks;

namespace gameroombookingsys.IService
{
    public interface IAuthService
    {
        Task<(string Email, string Code, DateTime ExpiresAt)> RequestCodeAsync(string email);
        Task<string> VerifyCodeAndIssueTokenAsync(string email, string code);
        Task<int> CleanupExpiredAsync();
    }
}


