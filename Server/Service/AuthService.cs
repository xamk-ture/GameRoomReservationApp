using System.Security.Claims;
using Gameroombookingsys.Models;
using gameroombookingsys.Helpers;
using gameroombookingsys.IService;
using gameroombookingsys.IRepository;

namespace gameroombookingsys.Service
{
    public class AuthService : IAuthService
    {
        private readonly IOneTimeLoginCodesRepository _codesRepository;
        private readonly IUsersRepository _usersRepository;
        private readonly ILogger<AuthService> _logger;

        public AuthService(
            IOneTimeLoginCodesRepository codesRepository, 
            IUsersRepository usersRepository, 
            ILogger<AuthService> logger)
        {
            _codesRepository = codesRepository;
            _usersRepository = usersRepository;
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

            await _codesRepository.RemoveExistingCodesForEmail(email);

            await _codesRepository.Add(new OneTimeLoginCode
            {
                Email = email,
                Code = code,
                ExpiresAt = expiresAt,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            return (email, code, expiresAt);
        }

        public async Task<string> VerifyCodeAndIssueTokenAsync(string email, string code)
        {
            var record = await _codesRepository.GetLatest(email, code);

            if (record == null)
                throw new UnauthorizedAccessException("Invalid code.");

            if (record.ExpiresAt < DateTime.UtcNow)
            {
                await _codesRepository.Remove(record);
                throw new UnauthorizedAccessException("Code expired.");
            }

            await _codesRepository.Remove(record);
            
            // Upsert user in the database
            try
            {
                await _usersRepository.UpsertUser(email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error upserting user during login: {Email}", email);
                // Continue with token generation even if user upsert fails
            }

            var claims = new[] { new Claim("email", email) };
            var token = JwtTokenGenerator.CreateJwt(claims, DateTime.UtcNow.AddHours(1));
            return token;
        }

        public async Task<int> CleanupExpiredAsync()
        {
            return await _codesRepository.RemoveExpired(DateTime.UtcNow);
        }
    }
}


