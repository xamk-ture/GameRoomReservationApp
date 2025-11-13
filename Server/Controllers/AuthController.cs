using Microsoft.AspNetCore.Mvc;
using gameroombookingsys.IService;
using gameroombookingsys.DTOs;
using gameroombookingsys.Helpers;

namespace gameroombookingsys.Controllers
{
    [ApiController]
    [Route("api/auth")] 
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IAuthService authService, ILogger<AuthController> logger)
        {
            _authService = authService;
            _logger = logger;
        }

        /// <summary>
        /// Extracts and normalizes language code from Accept-Language header.
        /// Handles formats like "en-US", "fi-FI", "en-US,en;q=0.9", etc.
        /// Defaults to "fi" if header is missing or invalid.
        /// </summary>
        private string GetLanguageFromRequest()
        {
            var acceptLanguageHeader = Request.Headers["Accept-Language"].FirstOrDefault();
            
            if (string.IsNullOrWhiteSpace(acceptLanguageHeader))
            {
                return "fi";
            }

            // Accept-Language header can contain multiple languages with quality values
            // Example: "en-US,en;q=0.9,fi;q=0.8"
            // Take the first language code (before comma)
            var firstLanguage = acceptLanguageHeader
                .Split(',')
                .FirstOrDefault()?
                .Split(';')
                .FirstOrDefault()?
                .Trim();

            if (string.IsNullOrWhiteSpace(firstLanguage))
            {
                return "fi";
            }

            // Normalize language code (take first part if format is "en-US" or "fi-FI")
            if (firstLanguage.Contains('-'))
            {
                firstLanguage = firstLanguage.Split('-')[0];
            }

            var normalizedLanguage = firstLanguage.ToLower();
            
            // Only support "en" and "fi", default to "fi" for anything else
            return normalizedLanguage == "en" ? "en" : "fi";
        }

        // 1) Request code: accepts xamk.fi email, generates and stores code, returns code in response (for now)
        [HttpPost("request-code")]
        public async Task<IActionResult> RequestCode([FromBody] RequestCodeDto dto)
        {
            var language = GetLanguageFromRequest();

            if (dto == null || string.IsNullOrWhiteSpace(dto.Email))
            {
                string errorMessage = await ResourceLoader.GetStringAsync(language, "Errors", "EmailRequired", "Email is required.");
                return BadRequest(errorMessage);
            }

            var email = dto.Email.Trim();
            
            try
            {
                var result = await _authService.RequestCodeAsync(email, language);
                return Ok(new { email = result.Email, code = result.Code, expiresAt = result.ExpiresAt });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // 2) Verify code: validates and returns JWT; removes row on success
        [HttpPost("verify-code")]
        public async Task<IActionResult> VerifyCode([FromBody] VerifyCodeDto dto)
        {
            var language = GetLanguageFromRequest();

            if (dto == null || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Code))
            {
                string errorMessage = await ResourceLoader.GetStringAsync(language, "Errors", "EmailAndCodeRequired", "Email and code are required.");
                return BadRequest(errorMessage);
            }

            var email = dto.Email.Trim();
            var code = dto.Code.Trim();
            try
            {
                var token = await _authService.VerifyCodeAndIssueTokenAsync(email, code, language);
                return Ok(new { token });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ex.Message);
            }
        }

        // Optional cleanup endpoint: remove expired codes
        [HttpPost("cleanup-expired")] 
        public async Task<IActionResult> CleanupExpired()
        {
            var removed = await _authService.CleanupExpiredAsync();
            return Ok(new { removed });
        }
    }
}
