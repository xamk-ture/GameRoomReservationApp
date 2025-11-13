using System.Threading.Tasks;

namespace gameroombookingsys.IService
{
    public interface IAuthService
    {
        Task<(string Email, string Code, DateTime ExpiresAt)> RequestCodeAsync(string email, string language = "fi");
        Task<string> VerifyCodeAndIssueTokenAsync(string email, string code, string language = "fi");
        Task<int> CleanupExpiredAsync();
    }
}


