using Gameroombookingsys.Models;

namespace gameroombookingsys.IRepository
{
    public interface IOneTimeLoginCodesRepository
    {
        Task RemoveExistingCodesForEmail(string email);
        Task<OneTimeLoginCode> Add(OneTimeLoginCode code);
        Task<OneTimeLoginCode?> GetLatest(string email, string code);
        Task Remove(OneTimeLoginCode code);
        Task<int> RemoveExpired(DateTime nowUtc);
    }
}
