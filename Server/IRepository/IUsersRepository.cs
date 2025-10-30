using Gameroombookingsys.Models;

namespace gameroombookingsys.IRepository
{
    public interface IUsersRepository
    {
        Task<AuthUser?> GetUserByEmail(string email);
        Task<AuthUser> UpsertUser(string email);
        Task<List<AuthUser>> GetAllUsers();
        Task<int> DeleteUsers(IEnumerable<string> emails);
    }
}