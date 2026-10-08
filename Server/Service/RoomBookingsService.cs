using gameroombookingsys.DTOs;
using gameroombookingsys.Enums;
using gameroombookingsys.Helpers;
using gameroombookingsys.Interfaces;
using gameroombookingsys.IRepository;
using gameroombookingsys.IService;
using Gameroombookingsys.Models;
using Gameroombookingsys.Repository;
using System.Numerics;

namespace gameroombookingsys.Service
{
    public class RoomBookingsService : IRoomBookingsService
    {
        private readonly IRoomBookingsRepository _repository;
        private readonly IDevicesRepository _deviceRepository;
        private readonly IPlayersRepository _playersRepository;
        private readonly ILogger<RoomBookingsService> _logger;
        private readonly KeycloakHelper _keycloakHelper;
        private readonly IEmailService _emailService;
        public RoomBookingsService(IRoomBookingsRepository repository,
        IPlayersRepository playersRepository,
        ILogger<RoomBookingsService> logger,
        KeycloakHelper keycloakHelper,
        IDevicesRepository deviceRepository,
        IEmailService emailService)
        {
            _repository = repository;
            _playersRepository = playersRepository;
            _logger = logger;
            _keycloakHelper = keycloakHelper;
            _deviceRepository = deviceRepository;
            _emailService = emailService; 
        }
        public async Task<RoomBookingDto> BookGameRoom(RoomBookingDto dto)
        {
            try
            {
                Player? player = null;

                // If PlayerId is provided in the request (admin creating booking for another user), use it
                // Otherwise, authenticate and use the authenticated player's ID
                if (dto.PlayerId.HasValue && dto.PlayerId.Value > 0)
                {
                    // Admin is creating booking for another user - verify the player exists
                    player = await _playersRepository.GetPlayerById(dto.PlayerId.Value);
                    if (player == null)
                        throw new KeyNotFoundException($"Player with ID {dto.PlayerId.Value} not found.");
                    dto.PlayerId = player.Id;
                }
                else
                {
                    // Normal user booking - authenticate and use authenticated player's ID
                    var email = _keycloakHelper.GetUserEmail();
                    if (string.IsNullOrEmpty(email))
                        throw new Exception("User not authenticated.");

                    // Look up the player by email
                    player = await _playersRepository.GetPlayerByEmail(email);
                    if (player == null)
                    {
                        // Auto-create minimal Player record for first-time authenticated users
                        player = await _playersRepository.AddPlayer(new Player
                        {
                            Email = email,
                        });
                    }

                    // Ensure player's email is a university email
                    if (!_keycloakHelper.IsSchoolEmail(email))
                        throw new Exception("A university email is required.");

                    // Set the booking's playerId to the authenticated player's ID
                    dto.PlayerId = player.Id;
                }

                // Validate booking date/time
                if (dto.BookingDateTime == default)
                    throw new ArgumentException("Booking date/time is required.");
                if (dto.BookingDateTime <= DateTime.Now)
                    throw new ArgumentException("Booking date/time must be in the future.");

                var hour = dto.BookingDateTime.Hour;
                if (hour < 8 || hour >= 20)
                {
                    throw new ArgumentException("Bookings can only be made between 08:00 and 20:00.");
                }

                // Validate duration: 0.5h to 2h, in 0.5 increments
                if (dto.Duration < 0.5)
                    throw new ArgumentException("Duration must be at least 0.5 hours.");
                if (dto.Duration > 2)
                    throw new ArgumentException("Duration must be 2 hours or less.");
                if (Math.Abs(dto.Duration * 2 - Math.Round(dto.Duration * 2)) > 1e-9)
                    throw new ArgumentException("Duration must be in 0.5 hour increments.");

                if (dto.isPlayingAlone && dto.Fellows > 0)
                    throw new ArgumentException("You cannot play alone and have fellows at the same time.");
                if (!dto.isPlayingAlone && dto.Fellows == 0)
                    throw new ArgumentException("If you are not playing alone, you must specify the number of fellows.");

                // Enforce exactly one device per booking
                if (dto.Devices == null || dto.Devices.Count != 1)
                    throw new ArgumentException("Exactly one device must be selected for a booking.");

                var deviceId = dto.Devices.First().Id;
                bool isDeviceAvailable = await _repository.IsDeviceAvailable(dto.BookingDateTime, dto.Duration, deviceId);
                if (!isDeviceAvailable)
                    throw new InvalidOperationException("Selected device is not available for the requested time.");

                if (dto.BookingDateTime <= DateTime.Now)
                    throw new ArgumentException("Booking date/time must be in the future.");

                // Set status to Upcoming
                dto.Status = BookingStatus.Upcoming;

                // Map DTO to entity
                // PlayerId should always have a value at this point (set above)
                if (!dto.PlayerId.HasValue)
                    throw new InvalidOperationException("PlayerId is required for booking creation.");

                var booking = new RoomBooking
                {
                    BookingDateTime = dto.BookingDateTime,
                    Duration = dto.Duration,
                    isPlayingAlone = dto.isPlayingAlone,
                    Fellows = dto.Fellows,
                    Status = dto.Status,
                    PlayerId = dto.PlayerId.Value,
                    PassCode = GeneratePassCode(),
                };

                // Link the selected device
                var selectedDevice = await _deviceRepository.GetDeviceById(deviceId);
                if (selectedDevice == null)
                    throw new KeyNotFoundException($"Device with ID {deviceId} not found.");
                booking.Devices.Add(selectedDevice);

                // Save
                var savedBooking = await _repository.AddRoomBooking(booking);

                // Update the DTO's ID to reflect the newly created booking
                dto.Id = savedBooking.Id;
                dto.PassCode = savedBooking.PassCode;

                // Send confirmation email with the passcode (non-blocking for failures)
                try
                {
                    var subject = "Game Room Booking Confirmation";
                    var body = $"Your booking has been confirmed. Your game room pass code is: {savedBooking.PassCode}";
                    await _emailService.SendBookingConfirmationEmailAsync(player.Email, subject, body);
                }
                catch (Exception emailEx)
                {
                    _logger.LogError(emailEx, "Failed to send booking confirmation email to {Email}", player.Email);
                    // Do not fail the booking on email errors
                }

                return dto;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred in BookGameRoom in service.");
                throw;
            }
        } 
        public async Task<RoomBookingDto> UpdateRoomBooking(int id, RoomBookingDto dto)
        {
            try
            {
                // Use the id from the URL as the definitive identifier.
                dto.Id = id;

                // Retrieve the existing booking by id.
                var booking = await _repository.GetRoomBookingById(id);
                if (booking == null)
                    throw new KeyNotFoundException("Booking not found.");

                // Check if the booking is already cancelled.
                if (booking.Status == BookingStatus.Cancelled)
                    throw new InvalidOperationException("Booking is already cancelled and cannot be updated.");

                // If the update is intended to cancel the booking,
                // the client can simply set the status to Cancelled.
                if (dto.Status == BookingStatus.Cancelled)
                {
                    // Prevent cancellation if the booking is in the past.
                    if (booking.BookingDateTime < DateTime.Now)
                        throw new InvalidOperationException("Cannot cancel a booking in the past.");

                    booking.Status = BookingStatus.Cancelled;
                }
                else
                {
                    // Validate duration updates: 0.5h to 2h, in 0.5 increments
                    if (dto.Duration < 0.5)
                        throw new ArgumentException("Duration must be at least 0.5 hours.");
                    if (dto.Duration > 2)
                        throw new ArgumentException("Duration must be 2 hours or less.");
                    if (Math.Abs(dto.Duration * 2 - Math.Round(dto.Duration * 2)) > 1e-9)
                        throw new ArgumentException("Duration must be in 0.5 hour increments.");

                    // Enforce exactly one device and check availability for the new window
                    // Exclude the current booking from availability check since we're updating it
                    if (dto.Devices == null || dto.Devices.Count != 1)
                        throw new ArgumentException("Exactly one device must be selected for a booking.");
                    var deviceId = dto.Devices.First().Id;
                    
                    // Check if device changed - if same device, exclude current booking from check
                    bool sameDevice = booking.Devices.Any(d => d.Id == deviceId);
                    bool isDeviceAvailable;
                    if (sameDevice)
                    {
                        // Same device: exclude current booking from availability check
                        isDeviceAvailable = await _repository.IsDeviceAvailableExcludingBooking(dto.BookingDateTime, dto.Duration, deviceId, booking.Id);
                    }
                    else
                    {
                        // Different device: check normal availability
                        isDeviceAvailable = await _repository.IsDeviceAvailable(dto.BookingDateTime, dto.Duration, deviceId);
                    }
                    
                    if (!isDeviceAvailable)
                        throw new InvalidOperationException("Selected device is not available for the requested time.");

                    // Update the booking fields
                    booking.BookingDateTime = dto.BookingDateTime;
                    booking.Duration = dto.Duration; 
                    booking.isPlayingAlone = dto.isPlayingAlone;
                    booking.Fellows = dto.Fellows;
                    booking.Status = dto.Status;

                    // Clear existing and add the selected device
                    booking.Devices.Clear();
                    var selectedDevice = await _deviceRepository.GetDeviceById(deviceId);
                    if (selectedDevice == null)
                        throw new KeyNotFoundException($"Device with ID {deviceId} not found.");
                    booking.Devices.Add(selectedDevice);
                }

                // Save the updated booking through the repository.
                var updatedBooking = await _repository.UpdateRoomBooking(booking);

                // Map updated entity back to DTO
                var updatedDto = new RoomBookingDto(updatedBooking);

                // Retrieve the player so we can get the email.
                // Ensure your players repository has a method GetPlayerById.
                var player = await _playersRepository.GetPlayerById(booking.PlayerId);
                if (player == null)
                {
                    throw new Exception("Associated player not found.");
                }

                // Build email subject and body based on booking status.
                string subject, body;
                if (updatedBooking.Status == BookingStatus.Cancelled)
                {
                    subject = "Booking Cancellation Confirmation";
                    body = $"Your booking has been cancelled. Your game room pass code was: {updatedDto.PassCode}";
                }
                else
                {
                    subject = "Game Room Booking Confirmation";
                    body = $"Your booking has been updated. Your game room pass code is: {updatedDto.PassCode}";
                }

                // Send confirmation email (non-blocking for failures)
                try
                {
                    await _emailService.SendBookingConfirmationEmailAsync(player.Email, subject, body);
                }
                catch (Exception emailEx)
                {
                    _logger.LogError(emailEx, "Failed to send booking update email to {Email}", player.Email);
                    // Do not fail the update on email errors
                }

                return updatedDto;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating room booking.");
                throw;
            }
        }

        private void UpdateBookingStatus(RoomBooking booking)
        {
            if (booking.Status != BookingStatus.Cancelled)
            {
                var now = DateTime.Now;
                if (now >= booking.BookingDateTime && now < booking.BookingDateTime.AddHours(booking.Duration))
                {
                    booking.Status = BookingStatus.Ongoing;
                }
                else if (now >= booking.BookingDateTime.AddHours(booking.Duration))
                {
                    booking.Status = BookingStatus.Completed;
                }
                else
                {
                    booking.Status = BookingStatus.Upcoming;
                }
            }
        }

        public async Task<bool> DeleteBooking(int id)
        {
            try
            {
                var booking = await _repository.GetRoomBookingById(id);
                if (booking == null)
                    throw new KeyNotFoundException($"Booking with ID {id} was not found.");

                await _repository.DeleteRoomBooking(booking);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting booking with ID {id}.");
                throw new Exception($"An error occurred while deleting booking with ID {id}: {ex.Message}", ex);
            }
        }

        public async Task<bool> DeleteOwnBooking(int id)
        {
            try
            {
                var booking = await _repository.GetRoomBookingById(id);
                if (booking == null)
                    throw new KeyNotFoundException($"Booking with ID {id} was not found.");

                // Verify ownership by authenticated user
                var email = _keycloakHelper.GetUserEmail();
                if (string.IsNullOrEmpty(email))
                    throw new UnauthorizedAccessException("User not authenticated.");

                var player = await _playersRepository.GetPlayerById(booking.PlayerId);
                if (player == null || !string.Equals(player.Email, email, StringComparison.OrdinalIgnoreCase))
                    throw new UnauthorizedAccessException("You can only delete your own bookings.");

                await _repository.DeleteRoomBooking(booking);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting own booking with ID {id}.");
                throw;
            }
        }

        public async Task<List<RoomBookingDto>> GetAllBookings()
        {
            try
            {
                // Assuming repository returns a list of RoomBooking entities.
                var bookings = await _repository.GetAllBookings();
                // Update the status for each booking based on current time.
                foreach (var booking in bookings)
                {
                    UpdateBookingStatus(booking);
                }
                return bookings.Select(b => new RoomBookingDto(b)).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving all bookings.");
                throw;
            }
        }
        public async Task<List<RoomBookingDto>> GetHistoryBookings()
        {
            try
            {
                // Get all bookings and update statuses.
                var bookings = await _repository.GetAllBookings();
                foreach (var booking in bookings)
                {
                    UpdateBookingStatus(booking);
                }
                // Filter bookings marked as Completed.
                var historyBookings = bookings.Where(b => b.Status == BookingStatus.Completed).ToList();
                return historyBookings.Select(b => new RoomBookingDto(b)).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving history bookings.");
                throw;
            }
        }

        public async Task<List<RoomBookingDto>> GetOngoingBookings()
        {
            try
            {
                var bookings = await _repository.GetAllBookings();
                foreach (var booking in bookings)
                {
                    UpdateBookingStatus(booking);
                }
                // Filter bookings marked as Ongoing.
                var ongoingBookings = bookings.Where(b => b.Status == BookingStatus.Ongoing).ToList();
                return ongoingBookings.Select(b => new RoomBookingDto(b)).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving ongoing bookings.");
                throw;
            }
        }

        public async Task<List<RoomBookingDto>> GetUpcomingBookings()
        {
            try
            {
                var bookings = await _repository.GetAllBookings();
                foreach (var booking in bookings)
                {
                    UpdateBookingStatus(booking);
                }
                // Filter bookings marked as Upcoming.
                var upcomingBookings = bookings.Where(b => b.Status == BookingStatus.Upcoming).ToList();
                return upcomingBookings.Select(b => new RoomBookingDto(b)).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving upcoming bookings.");
                throw;
            }
        }

        public async Task<RoomBookingDto> GetRoomBookingById(int id)
        {
            try
            {
                var booking = await _repository.GetRoomBookingById(id);
                if (booking == null)
                    throw new KeyNotFoundException("Booking not found.");

                // Update the status based on current time.
                UpdateBookingStatus(booking);
                // Persist any status changes.
                var updatedBooking = await _repository.UpdateRoomBooking(booking);

                return new RoomBookingDto(updatedBooking);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving booking by ID {id}.");
                throw;
            }
        }

        public async Task<List<RoomBookingDto>> GetRoomBookingsByPlayerId(int playerId)
        {
            try
            {
                var bookings = await _repository.GetRoomBookingsByPlayerId(playerId);
                if (bookings == null || !bookings.Any())
                {
                    return new List<RoomBookingDto>();
                }

                foreach (var b in bookings)
                {
                    var currentPassCode = b.PassCode;
                    UpdateBookingStatus(b);
                    b.PassCode = currentPassCode;
                    await _repository.UpdateRoomBooking(b);
                }

                return bookings.Select(b => new RoomBookingDto(b)).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving booking for player with ID {playerId}.");
                throw;
            }
        }
         
    public async Task<List<CalendarEventDto>> GetFreeTimeEventsForDay(DateTime day)
    {
        // Operating hours
        DateTime openTime = day.Date.AddHours(8);
        DateTime closeTime = day.Date.AddHours(20);

        var allBookings = await _repository.GetAllBookings();
        var dayBookings = allBookings
            .Where(b => b.Status != BookingStatus.Cancelled &&
                        b.BookingDateTime.Date == day.Date)
            .OrderBy(b => b.BookingDateTime)
            .ToList();

        // Preload devices and their quantities
        var deviceBookings = dayBookings
            .Select(b => new { Booking = b, DeviceIds = b.Devices.Select(d => d.Id).ToList() })
            .ToList();

        // Build change points
        var changePoints = new SortedSet<DateTime> { openTime, closeTime };
        foreach (var b in dayBookings)
        {
            var start = b.BookingDateTime < openTime ? openTime : b.BookingDateTime;
            var end = b.BookingDateTime.AddHours(b.Duration) > closeTime ? closeTime : b.BookingDateTime.AddHours(b.Duration);
            if (start < closeTime && end > openTime)
            {
                changePoints.Add(start);
                changePoints.Add(end);
            }
        }

        var points = changePoints.Where(p => p >= openTime && p <= closeTime).OrderBy(p => p).ToList();
        var intervals = new List<CalendarEventDto>();
        if (points.Count < 2)
        {
            return intervals;
        }

        // Fetch all devices once
        var devices = await _deviceRepository.GetAllDevices();

        for (int i = 0; i < points.Count - 1; i++)
        {
            var segStart = points[i];
            var segEnd = points[i + 1];
            if (segStart >= segEnd) continue;

            // Bookings overlapping this segment
            var overlapping = dayBookings.Where(b => b.BookingDateTime < segEnd && b.BookingDateTime.AddHours(b.Duration) > segStart).ToList();

            string color;
            if (!overlapping.Any())
            {
                color = "lightgreen"; // green: no bookings
            }
            else
            {
                // Count per device and compare to quantities
                bool allDevicesFull = true;
                foreach (var dv in devices)
                {
                    var capacity = dv.Quantity ?? 0;
                    if (capacity <= 0) continue;
                    var count = overlapping.Count(b => b.Devices.Any(d => d.Id == dv.Id));
                    if (count < capacity)
                    {
                        allDevicesFull = false;
                        break;
                    }
                }

                color = allDevicesFull ? "#ff9999" : "#ffec99"; // red-ish or yellow-ish
            }

            intervals.Add(new CalendarEventDto
            {
                Start = segStart,
                End = segEnd,
                Display = "background",
                Color = color
            });
        }

        return intervals;
    }

    public async Task<List<CalendarEventDto>> GetFreeTimeEventsForDateRange(DateTime startDate, DateTime endDate)
    {
        var allEvents = new List<CalendarEventDto>();
        
        // Fetch all bookings once for the entire date range
        var allBookings = await _repository.GetAllBookings();
        var rangeBookings = allBookings
            .Where(b => b.Status != BookingStatus.Cancelled &&
                        b.BookingDateTime.Date >= startDate.Date &&
                        b.BookingDateTime.Date <= endDate.Date)
            .ToList();

        // Fetch all devices once
        var devices = await _deviceRepository.GetAllDevices();

        // Process each day in the range
        var currentDate = startDate.Date;
        while (currentDate <= endDate.Date)
        {
            var openTime = currentDate.AddHours(8);
            var closeTime = currentDate.AddHours(20);
            
            var dayBookings = rangeBookings
                .Where(b => b.BookingDateTime.Date == currentDate)
                .OrderBy(b => b.BookingDateTime)
                .ToList();

            // Build change points for this day
            var changePoints = new SortedSet<DateTime> { openTime, closeTime };
            foreach (var b in dayBookings)
            {
                var start = b.BookingDateTime < openTime ? openTime : b.BookingDateTime;
                var end = b.BookingDateTime.AddHours(b.Duration) > closeTime ? closeTime : b.BookingDateTime.AddHours(b.Duration);
                if (start < closeTime && end > openTime)
                {
                    changePoints.Add(start);
                    changePoints.Add(end);
                }
            }

            var points = changePoints.Where(p => p >= openTime && p <= closeTime).OrderBy(p => p).ToList();
            
            if (points.Count >= 2)
            {
                for (int i = 0; i < points.Count - 1; i++)
                {
                    var segStart = points[i];
                    var segEnd = points[i + 1];
                    if (segStart >= segEnd) continue;

                    // Bookings overlapping this segment
                    var overlapping = dayBookings.Where(b => b.BookingDateTime < segEnd && b.BookingDateTime.AddHours(b.Duration) > segStart).ToList();

                    string color;
                    if (!overlapping.Any())
                    {
                        color = "lightgreen"; // green: no bookings
                    }
                    else
                    {
                        // Count per device and compare to quantities
                        bool allDevicesFull = true;
                        foreach (var dv in devices)
                        {
                            var capacity = dv.Quantity ?? 0;
                            if (capacity <= 0) continue;
                            var count = overlapping.Count(b => b.Devices.Any(d => d.Id == dv.Id));
                            if (count < capacity)
                            {
                                allDevicesFull = false;
                                break;
                            }
                        }

                        color = allDevicesFull ? "#ff9999" : "#ffec99"; // red-ish or yellow-ish
                    }

                    allEvents.Add(new CalendarEventDto
                    {
                        Start = segStart,
                        End = segEnd,
                        Display = "background",
                        Color = color
                    });
                }
            }
            
            currentDate = currentDate.AddDays(1);
        }

        return allEvents;
    }

    public async Task<List<DeviceAvailabilityDto>> GetDeviceAvailabilities(DateTime startTime, double duration)
    {
        try
        {
            _logger.LogInformation("GetDeviceAvailabilities service: Called with startTime: {StartTime}, duration: {Duration}", startTime, duration);
            var result = await _repository.GetDeviceAvailabilities(startTime, duration);
            _logger.LogInformation("GetDeviceAvailabilities service: Repository returned {Count} items", result.Count);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving device availabilities. startTime: {StartTime}, duration: {Duration}. Exception: {Exception}", 
                startTime, duration, ex.ToString());
            // Return empty list instead of throwing to prevent 500 errors
            // Frontend will handle this gracefully by showing all devices as available
            return new List<DeviceAvailabilityDto>();
        }
    }
 
    private string GeneratePassCode()
        {
            // Generate a random 6-digit passcode
            Random random = new Random();
            return random.Next(100000, 999999).ToString();
        }
    }
}
