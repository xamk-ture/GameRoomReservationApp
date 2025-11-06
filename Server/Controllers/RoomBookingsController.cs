using gameroombookingsys.DTOs;
using gameroombookingsys.Enums;
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
        public async Task<ActionResult<RoomBookingDto>> BookGameRoom([FromBody] RoomBookingCreateRequest request)
        {
            try
            {
                var dto = new RoomBookingDto
                {
                    BookingDateTime = request.BookingDateTime,
                    Duration = request.Duration,
                    isPlayingAlone = request.isPlayingAlone,
                    Fellows = request.Fellows,
                    Devices = (request.DeviceIds ?? new List<int>()).Distinct().Select(id => new DeviceDto { Id = id }).ToList(),
                    PlayerId = request.PlayerId,
                };
                var booking = await _roomBookingService.BookGameRoom(dto);
                return Ok(booking);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { Message = ex.Message });
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
        public async Task<ActionResult<RoomBookingDto>> UpdateRoomBooking(int id, [FromBody] RoomBookingUpdateRequest request)
        {
            try
            {
                var dto = new RoomBookingDto
                {
                    BookingDateTime = request.BookingDateTime,
                    Duration = request.Duration,
                    isPlayingAlone = request.isPlayingAlone,
                    Fellows = request.Fellows,
                    Devices = (request.DeviceIds ?? new List<int>()).Distinct().Select(id => new DeviceDto { Id = id }).ToList(),
                    Status = request.Status ?? BookingStatus.Upcoming,
                };
                var updatedBooking = await _roomBookingService.UpdateRoomBooking(id, dto);
                return Ok(updatedBooking);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { Message = ex.Message });
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
        [Microsoft.AspNetCore.Authorization.Authorize(Policy = "Admin")]
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

        // DELETE api/gameroombookings/my/{id}
        // Allows an authenticated user to delete their own booking
        // Must be before the generic {id} route to ensure proper routing
        [HttpDelete("my/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "DeleteOwnBooking")]
        public async Task<ActionResult> DeleteOwnBooking(int id)
        {
            _logger?.LogInformation("DeleteOwnBooking endpoint called with ID: {id}", id);
            try
            {
                var success = await _roomBookingService.DeleteOwnBooking(id);
                if (!success)
                {
                    _logger?.LogWarning("DeleteOwnBooking: Booking {id} not found or deletion failed", id);
                    return NotFound(new { Message = "Booking not found." });
                }
                _logger?.LogInformation("DeleteOwnBooking: Successfully deleted booking {id}", id);
                return Ok(new { Message = "Booking deleted successfully." });
            }
            catch (KeyNotFoundException ex)
            {
                _logger?.LogWarning(ex, "DeleteOwnBooking: Booking {id} not found", id);
                return NotFound(new { Message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger?.LogWarning(ex, "DeleteOwnBooking: Unauthorized access attempt for booking {id}", id);
                return StatusCode(StatusCodes.Status403Forbidden, new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error deleting own booking with ID {id}.", id);
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { Message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Policy = "Admin")]
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

        // GET api/gameroombookings/free-time-events-range?startDate=2025-05-01&endDate=2025-05-14
        [HttpGet("free-time-events-range")]
        [ProducesResponseType(typeof(List<CalendarEventDto>), StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "GetFreeTimeEventsForDateRange")]
        public async Task<ActionResult<List<CalendarEventDto>>> GetFreeTimeEventsForDateRange([FromQuery] string startDate, [FromQuery] string endDate)
        {
            try
            {
                DateTime start;
                if (string.IsNullOrWhiteSpace(startDate))
                {
                    return BadRequest(new { Message = "startDate parameter is required." });
                }
                
                // Try parsing with different formats (ISO, InvariantCulture, etc.)
                if (!DateTime.TryParse(startDate, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out start) &&
                    !DateTime.TryParse(startDate, out start))
                {
                    return BadRequest(new { Message = $"Invalid startDate parameter: '{startDate}'. Please provide a valid date (e.g., '2025-05-01' or ISO format)." });
                }

                DateTime end;
                if (string.IsNullOrWhiteSpace(endDate))
                {
                    return BadRequest(new { Message = "endDate parameter is required." });
                }
                
                // Try parsing with different formats (ISO, InvariantCulture, etc.)
                if (!DateTime.TryParse(endDate, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out end) &&
                    !DateTime.TryParse(endDate, out end))
                {
                    return BadRequest(new { Message = $"Invalid endDate parameter: '{endDate}'. Please provide a valid date (e.g., '2025-05-14' or ISO format)." });
                }

                if (start > end)
                {
                    return BadRequest(new { Message = "startDate must be before or equal to endDate." });
                }

                // Limit range to prevent too large queries (max 30 days)
                if ((end.Date - start.Date).TotalDays > 30)
                {
                    return BadRequest(new { Message = "Date range cannot exceed 30 days." });
                }

                var freeEvents = await _roomBookingService.GetFreeTimeEventsForDateRange(start, end);
                return Ok(freeEvents);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving free time events for date range {StartDate} to {EndDate}.", startDate, endDate);
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = ex.Message });
            }
        }

        // GET api/gameroombookings/bookings-for-availability
        // Returns bookings needed for availability calculation (without admin authorization)
        [HttpGet("bookings-for-availability")]
        [ProducesResponseType(typeof(List<RoomBookingDto>), StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "GetBookingsForAvailability")]
        public async Task<ActionResult<List<RoomBookingDto>>> GetBookingsForAvailability()
        {
            try
            {
                var bookings = await _roomBookingService.GetAllBookings();
                // Return only active bookings (not cancelled) with essential fields for availability calculation
                var activeBookings = bookings
                    .Where(b => b.Status != BookingStatus.Cancelled)
                    .Select(b => new RoomBookingDto
                    {
                        Id = b.Id,
                        BookingDateTime = b.BookingDateTime,
                        Duration = b.Duration,
                        Devices = b.Devices,
                        Status = b.Status
                    })
                    .ToList();
                return Ok(activeBookings);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving bookings for availability calculation.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = ex.Message });
            }
        }

        // GET api/gameroombookings/device-availabilities?startTime=2025-01-01T10:00:00&duration=2
        [HttpGet("device-availabilities")]
        [ProducesResponseType(typeof(List<DeviceAvailabilityDto>), StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "GetDeviceAvailabilities")]
        public async Task<ActionResult<List<DeviceAvailabilityDto>>> GetDeviceAvailabilities([FromQuery] string startTime, [FromQuery] double duration)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(startTime))
                {
                    return BadRequest(new { Message = "startTime parameter is required." });
                }

                // Try parsing with different formats
                DateTime start;
                if (!DateTime.TryParse(startTime, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.RoundtripKind, out start) &&
                    !DateTime.TryParse(startTime, out start))
                {
                    _logger.LogWarning("Failed to parse startTime: {StartTime}", startTime);
                    return BadRequest(new { Message = $"Invalid startTime parameter: '{startTime}'. Please provide a valid datetime (ISO format)." });
                }

                // Validate duration: 0.5 to 2 hours
                if (duration < 0.5)
                {
                    return BadRequest(new { Message = "Duration must be at least 0.5 hours." });
                }
                if (duration > 2)
                {
                    return BadRequest(new { Message = "Duration must be 2 hours or less." });
                }

                var availabilities = await _roomBookingService.GetDeviceAvailabilities(start, duration);
                _logger.LogInformation("GetDeviceAvailabilities endpoint: Returning {Count} availabilities for startTime: {StartTime}, duration: {Duration}", 
                    availabilities.Count, start, duration);
                return Ok(availabilities);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving device availabilities. startTime: {StartTime}, duration: {Duration}", startTime, duration);
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = ex.Message });
            }
        }

    }
}
