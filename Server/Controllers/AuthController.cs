using System.Security.Claims;
using Gameroombookingsys.Models;
using gameroombookingsys.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace gameroombookingsys.Controllers
{
    [ApiController]
    [Route("api/auth")] 
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ILogger<AuthController> _logger;

        public AuthController(AppDbContext db, ILogger<AuthController> logger)
        {
            _db = db;
            _logger = logger;
        }

        // 1) Request code: accepts xamk.fi email, generates and stores code, returns code in response (for now)
        [HttpPost("request-code")]
        public async Task<IActionResult> RequestCode([FromBody] RequestCodeDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Email))
                return BadRequest("Email is required.");

            var email = dto.Email.Trim();
            if (!email.EndsWith("@xamk.fi", StringComparison.OrdinalIgnoreCase) &&
                !email.EndsWith("@edu.xamk.fi", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("Only xamk.fi emails are allowed.");
            }

            // Generate 6-digit code
            var code = Random.Shared.Next(0, 1_000_000).ToString("D6");
            var expiresAt = DateTime.UtcNow.AddMinutes(10);

            // Remove existing codes for this email to keep one active
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

            // For now, return the code in response; later send via email
            return Ok(new { email, code, expiresAt });
        }

        // 2) Verify code: validates and returns JWT; removes row on success
        [HttpPost("verify-code")]
        public async Task<IActionResult> VerifyCode([FromBody] VerifyCodeDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Code))
                return BadRequest("Email and code are required.");

            var email = dto.Email.Trim();
            var code = dto.Code.Trim();

            var record = await _db.OneTimeLoginCodes
                .Where(x => x.Email == email && x.Code == code)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync();

            if (record == null)
                return Unauthorized("Invalid code.");

            if (record.ExpiresAt < DateTime.UtcNow)
            {
                _db.OneTimeLoginCodes.Remove(record);
                await _db.SaveChangesAsync();
                return Unauthorized("Code expired.");
            }

            // Remove on successful login
            _db.OneTimeLoginCodes.Remove(record);
            await _db.SaveChangesAsync();

            // Issue JWT containing email claim
            var claims = new[] { new Claim("email", email) };
            var token = JwtTokenGenerator.CreateJwt(claims, DateTime.UtcNow.AddHours(1));
            return Ok(new { token });
        }

        // Optional cleanup endpoint: remove expired codes
        [HttpPost("cleanup-expired")] 
        public async Task<IActionResult> CleanupExpired()
        {
            var now = DateTime.UtcNow;
            var expired = await _db.OneTimeLoginCodes.Where(x => x.ExpiresAt < now).ToListAsync();
            if (expired.Count > 0)
            {
                _db.OneTimeLoginCodes.RemoveRange(expired);
                await _db.SaveChangesAsync();
            }
            return Ok(new { removed = expired.Count });
        }
    }

    public class RequestCodeDto
    {
        public string Email { get; set; }
    }

    public class VerifyCodeDto
    {
        public string Email { get; set; }
        public string Code { get; set; }
    }
}
