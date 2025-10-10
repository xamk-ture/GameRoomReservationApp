using System.Security.Claims;
using Gameroombookingsys.Models;
using gameroombookingsys.Helpers;
using gameroombookingsys.IService;
using Microsoft.EntityFrameworkCore;

namespace gameroombookingsys.Service
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _db;
        private readonly ILogger<AuthService> _logger;

        public AuthService(AppDbContext db, ILogger<AuthService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<(string Email, string Code, DateTime ExpiresAt)> RequestCodeAsync(string email)
        {
            if (!email.EndsWith("@xamk.fi", StringComparison.OrdinalIgnoreCase) &&
                !email.EndsWith("@edu.xamk.fi", StringComparison.OrdinalIgnoreCase))
            {
                throw new ArgumentException("Only xamk.fi emails are allowed.");
            }

            var code = Random.Shared.Next(0, 1_000_000).ToString("D6");
            var expiresAt = DateTime.UtcNow.AddMinutes(10);

            var existing = await _db.OneTimeLoginCodes.Where(x => x.Email == email).ToListAsync();
            if (existing.Count > 0)
            {
                _db.OneTimeLoginCodes.RemoveRange(existing);
            }

            _db.OneTimeLoginCodes.Add(new OneTimeLoginCode
            {
                Email = email,
                Code = code,
                ExpiresAt = expiresAt,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            return (email, code, expiresAt);
        }

        public async Task<string> VerifyCodeAndIssueTokenAsync(string email, string code)
        {
            var record = await _db.OneTimeLoginCodes
                .Where(x => x.Email == email && x.Code == code)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync();

            if (record == null)
                throw new UnauthorizedAccessException("Invalid code.");

            if (record.ExpiresAt < DateTime.UtcNow)
            {
                _db.OneTimeLoginCodes.Remove(record);
                await _db.SaveChangesAsync();
                throw new UnauthorizedAccessException("Code expired.");
            }

            _db.OneTimeLoginCodes.Remove(record);
            await _db.SaveChangesAsync();

            var claims = new[] { new Claim("email", email) };
            var token = JwtTokenGenerator.CreateJwt(claims, DateTime.UtcNow.AddHours(1));
            return token;
        }

        public async Task<int> CleanupExpiredAsync()
        {
            var now = DateTime.UtcNow;
            var expired = await _db.OneTimeLoginCodes.Where(x => x.ExpiresAt < now).ToListAsync();
            if (expired.Count > 0)
            {
                _db.OneTimeLoginCodes.RemoveRange(expired);
                await _db.SaveChangesAsync();
            }
            return expired.Count;
        }
    }
}


