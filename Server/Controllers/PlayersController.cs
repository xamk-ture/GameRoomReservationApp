using Microsoft.AspNetCore.Mvc; 
using System.Security.Claims;
using gameroombookingsys.Interfaces;
using gameroombookingsys.DTOs;
using Swashbuckle.AspNetCore.Annotations;
using Microsoft.Extensions.Logging;
using gameroombookingsys.Helpers;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Microsoft.AspNetCore.Authorization;

[ApiController]
[Route("api/players")]
[Authorize]
public class PlayersController : ControllerBase
{
    private readonly IPlayersService _playerService;
    private readonly ILogger<PlayersController> _logger;
    private readonly KeycloakHelper _keycloakHelper;

    public PlayersController(IPlayersService playerService, ILogger<PlayersController> logger, KeycloakHelper keycloakHelper)
    {
        _playerService = playerService;
        _logger = logger;
        _keycloakHelper = keycloakHelper;
    }

    // GET api/players/profile
    [HttpGet("profile")]
    // Ensure Swagger sees PlayerDto
    [ProducesResponseType(typeof(PlayerDto), StatusCodes.Status200OK)]
    // Control the method name
    [SwaggerOperation(OperationId = "GetPlayerInfo")]
    public async Task<ActionResult> GetPlayerInfo()
    {
        try
        {
            // Retrieve the email from the token using KeycloakHelper.
            var email = _keycloakHelper.GetUserEmail();
            _logger.LogInformation("Fetching player info for email: {Email}", email);

            if (string.IsNullOrEmpty(email))
            {
                return Unauthorized("No email claim found.");
            }

            // Check if email meets the school domain requirement.
            if (!_keycloakHelper.IsSchoolEmail(email))
            {
                return Unauthorized("Only school emails ending with '@edu.xamk.fi' are allowed.");
            }

            // Auto-provision a player profile for first-time authenticated users
            var playerDto = await _playerService.GetOrCreatePlayerByEmail(email);
            return Ok(playerDto);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error fetching player info", error = ex.Message });
        }
    }

    [HttpGet("all")]
    [ProducesResponseType(typeof(List<PlayerDto>), StatusCodes.Status200OK)]
    [SwaggerOperation(OperationId = "GetAllPlayers")]
    public async Task<ActionResult<List<PlayerDto>>> GetAllPlayers()
    {
        try
        {
            var players = await _playerService.GetAllPlayers();
            return Ok(players);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error fetching players", error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(PlayerDto), StatusCodes.Status200OK)]
    [SwaggerOperation(OperationId = "UpdatePlayerInfoById")]
    public async Task<ActionResult<PlayerDto>> UpdatePlayerInfoById(int id, [FromBody] PlayerDto playerDto)
    {
        try
        {
            if (id != playerDto.Id)
                return BadRequest("ID mismatch between URL and payload.");

            var updatedPlayer = await _playerService.UpdatePlayerInfo(playerDto);
            return Ok(updatedPlayer);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error updating player info", error = ex.Message });
        }
    }

}