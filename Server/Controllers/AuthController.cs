using Microsoft.AspNetCore.Mvc;
using gameroombookingsys.IService;
using gameroombookingsys.DTOs;
using gameroombookingsys.Helpers;
using Microsoft.Extensions.Configuration;
using Azure.Communication.Email;

namespace gameroombookingsys.Controllers
{
    [ApiController]
    [Route("api/auth")] 
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ILogger<AuthController> _logger;
        private readonly IConfiguration _configuration;

        public AuthController(IAuthService authService, ILogger<AuthController> logger, IConfiguration configuration)
        {
            _authService = authService;
            _logger = logger;
            _configuration = configuration;
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

        // Test endpoint for email sending (temporary - remove after testing)
        [HttpGet("test-email")]
        public async Task<IActionResult> TestEmail(string to)
        {
            try 
            {
                _logger.LogInformation("[TEST] Testing email to {Email}", to);
                
                // Get configuration values
                var connectionString = _configuration.GetConnectionString("CommunicationConnection")
                    ?? _configuration["ConnectionStrings:CommunicationConnection"]
                    ?? _configuration["CommunicationConnection"]
                    ?? Environment.GetEnvironmentVariable("ConnectionStrings__CommunicationConnection")
                    ?? Environment.GetEnvironmentVariable("CommunicationConnection");

                var sender = _configuration["EmailSettings:SenderAddress"]
                    ?? _configuration["Email:SenderAddress"]
                    ?? Environment.GetEnvironmentVariable("EmailSettings__SenderAddress");

                _logger.LogInformation("[TEST] Sender Address: {Sender}", string.IsNullOrEmpty(sender) ? "NULL/EMPTY" : sender);
                _logger.LogInformation("[TEST] Connection String: {HasConnectionString}", string.IsNullOrEmpty(connectionString) ? "NULL/EMPTY" : "SET (hidden)");

                if (string.IsNullOrEmpty(connectionString))
                {
                    return BadRequest(new { error = "Connection String puuttuu!", 
                        message = "Please set 'ConnectionStrings:CommunicationConnection' in Azure App Service Configuration" });
                }

                if (string.IsNullOrEmpty(sender))
                {
                    return BadRequest(new { error = "Sender Address puuttuu!", 
                        message = "Please set 'EmailSettings:SenderAddress' in Azure App Service Configuration" });
                }

                // Create client manually for this test
                var client = new EmailClient(connectionString);

                var emailContent = new EmailContent("Testiviesti Azuresta")
                {
                    Html = "<html><body><h1>Toimii!</h1><p>Tämä on testiviesti Azure Communication Servicesista.</p></body></html>"
                };

                var emailMessage = new EmailMessage(sender, to, emailContent);

                var emailOperation = await client.SendAsync(
                    Azure.WaitUntil.Completed,
                    emailMessage);

                _logger.LogInformation("[TEST] Email sent successfully. Operation ID: {OperationId}, Status: {Status}", 
                    emailOperation.Id, emailOperation.Value.Status);

                return Ok(new { 
                    success = true, 
                    message = "Email lähetetty!", 
                    operationId = emailOperation.Id,
                    status = emailOperation.Value.Status.ToString()
                });
            }
            catch (Exception ex)
            {
                // This is the error we want to see!
                _logger.LogError(ex, "[TEST] VIRHE: {Message}\nStackTrace: {StackTrace}", ex.Message, ex.StackTrace);
                return StatusCode(500, new { 
                    error = "Email lähetys epäonnistui", 
                    message = ex.Message, 
                    stackTrace = ex.StackTrace,
                    innerException = ex.InnerException?.Message
                });
            }
        }
    }
}
