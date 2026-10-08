using Gameroombookingsys.Models;
using Microsoft.EntityFrameworkCore;

namespace gameroombookingsys.Repository
{
    public class OneTimeLoginCodesRepository : gameroombookingsys.IRepository.IOneTimeLoginCodesRepository
    {
        private readonly AppDbContext _db;
        private readonly ILogger<OneTimeLoginCodesRepository> _logger;

        public OneTimeLoginCodesRepository(AppDbContext db, ILogger<OneTimeLoginCodesRepository> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task RemoveExistingCodesForEmail(string email)
        {
            var existing = await _db.OneTimeLoginCodes.Where(x => x.Email == email).ToListAsync();
            if (existing.Count > 0)
            {
                _db.OneTimeLoginCodes.RemoveRange(existing);
                await _db.SaveChangesAsync();
            }
        }

        public async Task<OneTimeLoginCode> Add(OneTimeLoginCode code)
        {
            _db.OneTimeLoginCodes.Add(code);
            await _db.SaveChangesAsync();
            return code;
        }

        public async Task<OneTimeLoginCode?> GetLatest(string email, string code)
        {
            return await _db.OneTimeLoginCodes
                .Where(x => x.Email == email && x.Code == code)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task Remove(OneTimeLoginCode code)
        {
            _db.OneTimeLoginCodes.Remove(code);
            await _db.SaveChangesAsync();
        }

        public async Task<int> RemoveExpired(DateTime nowUtc)
        {
            var expired = await _db.OneTimeLoginCodes.Where(x => x.ExpiresAt < nowUtc).ToListAsync();
            if (expired.Count > 0)
            {
                _db.OneTimeLoginCodes.RemoveRange(expired);
                await _db.SaveChangesAsync();
            }
            return expired.Count;
        }
    }
}
