using Microsoft.AspNetCore.Mvc;
using gameroombookingsys.Helpers;
using System;
using System.Threading.Tasks;
using gameroombookingsys.IService;
using gameroombookingsys.DTOs; 
using Swashbuckle.AspNetCore.Annotations;

namespace gameroombookingsys.Controllers
{
    [ApiController]
    [Route("api/registration")]
    public class RegistrationController : ControllerBase
    {
        private readonly IEmailService _registrationService;

        public RegistrationController(IEmailService registrationService)
        {
            _registrationService = registrationService;
        }

        // POST: api/registration/send-registration-link
        [HttpPost("send-registration-link")]
        [ProducesResponseType(typeof(RegistrationResponse), StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "SendRegistrationLink")]
        public async Task<ActionResult> SendRegistrationLink([FromBody] RegistrationRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.Email))
            {
                return BadRequest("Email is required.");
            }
            if (!request.Email.EndsWith("@edu.xamk.fi", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("A valid university email is required.");
            }

            try
            {
                await _registrationService.SendRegistrationLinkAsync(request.Email);
                return Ok(new { Message = $"A registration link has been sent to {request.Email}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = ex.Message });
            }
        }
    }
}
