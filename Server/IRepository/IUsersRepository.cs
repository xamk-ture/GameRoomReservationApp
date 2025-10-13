using Gameroombookingsys.Models;

namespace gameroombookingsys.IRepository
{
    public interface IUsersRepository
    {
        Task<AuthUser?> GetUserByEmail(string email);
        Task<AuthUser> UpsertUser(string email);
    }
}