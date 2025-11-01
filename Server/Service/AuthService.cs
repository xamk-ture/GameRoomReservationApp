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
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;

        public AuthService(
            IOneTimeLoginCodesRepository codesRepository, 
            IUsersRepository usersRepository, 
            ILogger<AuthService> logger,
            IConfiguration configuration,
            IEmailService emailService)
        {
            _codesRepository = codesRepository;
            _usersRepository = usersRepository;
            _logger = logger;
            _configuration = configuration;
            _emailService = emailService;
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

            // Send verification code via email
            try
            {
                await _emailService.SendVerificationCodeAsync(email, code);
                _logger.LogInformation("Verification code sent to {Email}", email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send verification code email to {Email}", email);
                // Continue even if email sending fails - code is still stored in database
            }

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

            var claims = new List<Claim> { new Claim("email", email) };

            try
            {
                var allowedAdmins = _configuration.GetSection("Admin:AllowedEmails").Get<string[]>() ?? Array.Empty<string>();
                var allowedPatterns = _configuration.GetSection("Admin:AllowedEmailPatterns").Get<string[]>() ?? Array.Empty<string>();

                bool isExact = allowedAdmins.Any(a => a.Equals(email, StringComparison.OrdinalIgnoreCase));
                bool matchesPattern = allowedPatterns.Any(p => IsEmailMatch(email, p));

                if (isExact || matchesPattern)
                {
                    claims.Add(new Claim(System.Security.Claims.ClaimTypes.Role, "Admin"));
                }
            }
            catch { }

            var token = JwtTokenGenerator.CreateJwt(claims, DateTime.UtcNow.AddHours(1));
            return token;
        }

        public async Task<int> CleanupExpiredAsync()
        {
            return await _codesRepository.RemoveExpired(DateTime.UtcNow);
        }

        private static bool IsEmailMatch(string email, string pattern)
        {
            if (string.IsNullOrWhiteSpace(pattern)) return false;
            // Support simple '*' wildcard matching
            // Examples: "admin*@edu.xamk.fi", "*@xamk.fi"
            if (!pattern.Contains('*', StringComparison.Ordinal))
            {
                return string.Equals(email, pattern, StringComparison.OrdinalIgnoreCase);
            }

            var parts = pattern.Split('*');
            var remaining = email;
            var first = true;
            foreach (var part in parts)
            {
                if (part.Length == 0)
                {
                    continue;
                }
                var idx = remaining.IndexOf(part, first ? StringComparison.OrdinalIgnoreCase : StringComparison.OrdinalIgnoreCase);
                if (idx < 0) return false;
                // Move past the matched segment
                remaining = remaining.Substring(idx + part.Length);
                first = false;
            }
            // If pattern ends with '*' then we allow remaining to have extra chars
            // If pattern does not end with '*', ensure we matched the suffix at the end
            if (!pattern.EndsWith("*", StringComparison.Ordinal))
            {
                // We must have consumed to end (i.e., last part matched at the end)
                return remaining.Length == 0;
            }
            return true;
        }
    }
}


