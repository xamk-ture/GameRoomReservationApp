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
            // Minimal: list all known auth users by email
            // Using DbContext via repository FindAsync by keys is not suitable for list, so expose via context if needed.
            // For now, return 501 until repository exposes list. Placeholder for UI integration.
            return StatusCode(501, "Not implemented: expose Users list in repository");
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
            // IPlayersRepository doesn't expose list; return 501 until added.
            return StatusCode(501, "Not implemented: expose Players list in repository");
        }
    }
}


