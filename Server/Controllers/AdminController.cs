using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using gameroombookingsys.IRepository;
using Swashbuckle.AspNetCore.Annotations;

namespace gameroombookingsys.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize(Policy = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IUsersRepository _users;
        private readonly IRoomBookingsRepository _bookings;
        private readonly IDevicesRepository _devices;
        private readonly IPlayersRepository _players;

        public AdminController(
            IUsersRepository users,
            IRoomBookingsRepository bookings,
            IDevicesRepository devices,
            IPlayersRepository players)
        {
            _users = users;
            _bookings = bookings;
            _devices = devices;
            _players = players;
        }

        [HttpGet("users")]
        [SwaggerOperation(OperationId = "Admin_ListUsers")]
        public async Task<IActionResult> ListUsers()
        {
            var all = await _users.GetAllUsers();
            return Ok(all);
        }

        [HttpGet("bookings")]
        [SwaggerOperation(OperationId = "Admin_ListBookings")]
        public async Task<IActionResult> ListBookings()
        {
            var all = await _bookings.GetAllBookings();
            return Ok(all);
        }

        [HttpGet("devices")]
        [SwaggerOperation(OperationId = "Admin_ListDevices")]
        public async Task<IActionResult> ListDevices([FromServices] IDevicesRepository devicesRepository)
        {
            // DevicesRepository doesn't expose list; return 501 until added.
            return StatusCode(501, "Not implemented: expose Devices list in repository");
        }

        [HttpGet("players")]
        [SwaggerOperation(OperationId = "Admin_ListPlayers")]
        public async Task<IActionResult> ListPlayers()
        {
            var players = await _players.GetAllPlayers();
            var dtos = players.Select(p => new gameroombookingsys.DTOs.PlayerDto(p)).ToList();
            return Ok(dtos);
        }

        public class DeleteUsersRequest { public List<string> Emails { get; set; } = new(); }

        [HttpDelete("users")]
        [SwaggerOperation(OperationId = "Admin_DeleteUsers")]
        public async Task<IActionResult> DeleteUsers([FromBody] DeleteUsersRequest request)
        {
            if (request == null || request.Emails == null || request.Emails.Count == 0)
                return BadRequest(new { Message = "No emails provided." });

            var deleted = await _users.DeleteUsers(request.Emails);
            return Ok(new { Deleted = deleted });
        }
    }
}


