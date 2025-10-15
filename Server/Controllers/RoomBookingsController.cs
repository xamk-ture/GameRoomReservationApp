using gameroombookingsys.DTOs;
using gameroombookingsys.Interfaces;
using gameroombookingsys.Repository;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;


namespace gameroombookingsys.Controllers
{
    [ApiController]
    [Route("api/gameroombookings")]
    public class RoomBookingsController : ControllerBase
    {
        private readonly IRoomBookingsService _roomBookingService;
        private readonly ILogger<RoomBookingsController> _logger;

        public RoomBookingsController(IRoomBookingsService roomBookingService, ILogger<RoomBookingsController> logger)
        {
            _roomBookingService = roomBookingService;
            _logger = logger;
        }

        // POST api/gameroombookings/bookroom
        [HttpPost("bookgameroom")]
        // Ensure Swagger sees RoomBookingDto
        [ProducesResponseType(typeof(RoomBookingDto), StatusCodes.Status200OK)]
        // Control the method name
        [SwaggerOperation(OperationId = "BookGameRoom")]
        public async Task<ActionResult<RoomBookingDto>> BookGameRoom([FromBody] RoomBookingDto dto)
        {
            try
            {

                var booking = await _roomBookingService.BookGameRoom(dto);
                return Ok(booking);
            }
            catch (InvalidOperationException ex)
            {
                // Typically thrown if the room is not available
                return BadRequest(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                // Generic error handling
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { Message = ex.Message });
            }
        }

        // Put api/gameroombookings/{id}
        [HttpPut("booking/{id}")]
        // Ensure Swagger sees RoomBookingDto
        [ProducesResponseType(typeof(RoomBookingDto), StatusCodes.Status200OK)]
        // Control the method name
        [SwaggerOperation(OperationId = "UpdateRoomBooking")]
        public async Task<ActionResult<RoomBookingDto>> UpdateRoomBooking(int id, [FromBody] RoomBookingDto dto)
        {
            try
            {
                var updatedBooking = await _roomBookingService.UpdateRoomBooking(id, dto);
                return Ok(updatedBooking);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = ex.Message });
            }
        }

        // GET api/gameroombookings/upcomingbookings
        [HttpGet("upcomingbookings")]
        [ProducesResponseType(typeof(List<RoomBookingDto>), StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "GetUpcomingBookings")]
        public async Task<ActionResult<List<RoomBookingDto>>> GetUpcomingBookings()
        {
            try
            {
                var bookings = await _roomBookingService.GetUpcomingBookings();
                return Ok(bookings);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = ex.Message });
            }
        }

        // GET api/gameroombookings/ongoingbookings
        [HttpGet("ongoingbookings")]
        [ProducesResponseType(typeof(List<RoomBookingDto>), StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "GetOngoingBookings")]
        public async Task<ActionResult<List<RoomBookingDto>>> GetOngoingBookings()
        {
            try
            {
                var bookings = await _roomBookingService.GetOngoingBookings();
                return Ok(bookings);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = ex.Message });
            }
        }

        // GET api/gameroombookings/historybookings
        [HttpGet("historybookings")]
        [ProducesResponseType(typeof(List<RoomBookingDto>), StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "GetHistoryBookings")]
        public async Task<ActionResult<List<RoomBookingDto>>> GetHistoryBookings()
        {
            try
            {
                var bookings = await _roomBookingService.GetHistoryBookings();
                return Ok(bookings);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = ex.Message });
            }
        }

        // GET api/gameroombookings/{id}
        // (Assumes that you have added a GetRoomBookingById method in your service layer.)
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(RoomBookingDto), StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "GetRoomBookingById")]
        public async Task<ActionResult<RoomBookingDto>> GetRoomBookingById(int id)
        {
            try
            {
                var booking = await _roomBookingService.GetRoomBookingById(id);
                return Ok(booking);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = ex.Message });
            }
        }

        [HttpGet("player/{playerId}")]
        [ProducesResponseType(typeof(RoomBookingDto), StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "GetRoomBookingsByPlayerId")]
        public async Task<ActionResult<List<RoomBookingDto>>> GetRoomBookingsByPlayerId(int playerId)
        {
            try
            {
                var bookings = await _roomBookingService.GetRoomBookingsByPlayerId(playerId);
                // Return 200 OK with empty array instead of 404 when no bookings for the player
                return Ok(bookings);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = ex.Message });
            }
        }

        // Add this method in your RoomBookingsController
        [HttpGet("allbookings")]
        [ProducesResponseType(typeof(List<RoomBookingDto>), StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "GetAllBookings")]
        public async Task<ActionResult<List<RoomBookingDto>>> GetAllBookings()
        {
            try
            {
                var bookings = await _roomBookingService.GetAllBookings();
                return Ok(bookings);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [ProducesResponseType(typeof(List<RoomBookingDto>), StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "DeleteBooking")]
        public async Task<ActionResult> DeleteBooking(int id)
        {
            try
            {
                var success = await _roomBookingService.DeleteBooking(id);
                if (!success)
                {
                    _logger?.LogWarning("Booking with ID {id} was not found for deletion.", id);
                    return NotFound(new { Message = "Booking not found." });
                }
                _logger?.LogInformation("Booking with ID {id} deleted successfully.", id);
                return Ok(new { Message = "Booking deleted successfully." });
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error deleting booking with ID {id}.", id);
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { Message = ex.Message });
            }
        }

        // GET api/gameroombookings/free-time-events?date=2025-05-01
        [HttpGet("free-time-events")]
        [ProducesResponseType(typeof(List<CalendarEventDto>), StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "GetFreeTimeEventsForDay")]
        public async Task<ActionResult<List<CalendarEventDto>>> GetFreeTimeEventsForDay([FromQuery] string date)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(date) || !DateTime.TryParse(date, out DateTime day))
                {
                    return BadRequest(new { Message = "Invalid date parameter. Please provide a valid date (e.g., '2025-05-01')." });
                }

                var freeEvents = await _roomBookingService.GetFreeTimeEventsForDay(day);
                return Ok(freeEvents);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving free time events for day {Date}.", date);
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = ex.Message });
            }
        }

    }
}
