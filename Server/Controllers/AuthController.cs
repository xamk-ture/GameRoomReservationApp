using Microsoft.AspNetCore.Mvc;
using gameroombookingsys.IService;
using gameroombookingsys.DTOs;

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

        // 1) Request code: accepts xamk.fi email, generates and stores code, returns code in response (for now)
        [HttpPost("request-code")]
        public async Task<IActionResult> RequestCode([FromBody] RequestCodeDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Email))
                return BadRequest("Email is required.");

            var email = dto.Email.Trim();
            try
            {
                var result = await _authService.RequestCodeAsync(email);
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
            if (dto == null || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Code))
                return BadRequest("Email and code are required.");

            var email = dto.Email.Trim();
            var code = dto.Code.Trim();
            try
            {
                var token = await _authService.VerifyCodeAndIssueTokenAsync(email, code);
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
