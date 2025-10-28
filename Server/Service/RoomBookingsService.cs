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
                // Get the authenticated user's email from the HttpContext via KeycloakHelper
                var email = _keycloakHelper.GetUserEmail();
                if (string.IsNullOrEmpty(email))
                    throw new Exception("User not authenticated.");

                // Look up the player by email
                var player = await _playersRepository.GetPlayerByEmail(email);
                if (player == null)
                {
                    // Auto-create minimal Player record for first-time authenticated users
                    player = await _playersRepository.AddPlayer(new Player
                    {
                        Email = email,
                        Theme = "light",
                    });
                }

                // Ensure player's email is a university email
                if (!_keycloakHelper.IsSchoolEmail(email))
                    throw new Exception("A university email is required.");

                // Set the booking's playerId to the authenticated player's ID
                dto.PlayerId = player.Id;

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

                // Validate duration: must be > 0 and <= 2 hours.
                if (dto.Duration <= 0)
                    throw new ArgumentException("Duration must be greater than zero.");
                if (dto.Duration > 2)
                    throw new ArgumentException("Duration must be 2 hours or less.");

                if (dto.isPlayingAlone && dto.Fellows > 0)
                    throw new ArgumentException("You cannot play alone and have fellows at the same time.");
                if (!dto.isPlayingAlone && dto.Fellows == 0)
                    throw new ArgumentException("If you are not playing alone, you must specify the number of fellows.");

                bool isAvailable = await _repository.IsRoomAvailable(dto.BookingDateTime, dto.Duration);
                if (!isAvailable)
                    throw new InvalidOperationException("Room is not available at the requested time.");

                if (dto.BookingDateTime <= DateTime.Now)
                    throw new ArgumentException("Booking date/time must be in the future.");

                // Set status to Upcoming
                dto.Status = BookingStatus.Upcoming;

                // Map DTO to entity
                var booking = new RoomBooking
                {
                    BookingDateTime = dto.BookingDateTime,
                    Duration = dto.Duration,
                    isPlayingAlone = dto.isPlayingAlone,
                    Fellows = dto.Fellows,
                    Status = dto.Status,
                    PlayerId = dto.PlayerId,
                    PassCode = GeneratePassCode(),
                };

                // Link existing devices by Id (do NOT create new device rows)
                if (dto.Devices != null && dto.Devices.Count > 0)
                {
                    // De-duplicate incoming device selections by Id
                    var distinctIds = dto.Devices
                        .Where(d => d != null && d.Id > 0)
                        .Select(d => d.Id)
                        .Distinct()
                        .ToList();

                    foreach (var deviceId in distinctIds)
                    {
                        var device = await _deviceRepository.GetDeviceById(deviceId);
                        if (device == null)
                        {
                            throw new KeyNotFoundException($"Device with ID {deviceId} not found.");
                        }
                        booking.Devices.Add(device);
                    }
                }

                // Save
                var savedBooking = await _repository.AddRoomBooking(booking);

                // Update the DTO's ID to reflect the newly created booking
                dto.Id = savedBooking.Id;
                dto.PassCode = savedBooking.PassCode;

                // Send confirmation email with the passcode 
                var subject = "Game Room Booking Confirmation";
                var body = $"Your booking has been confirmed. Your game room pass code is: {savedBooking.PassCode}";
                await _emailService.SendBookingConfirmationEmailAsync(player.Email, subject, body);

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
                    // Update the booking fields
                    booking.BookingDateTime = dto.BookingDateTime;
                    booking.Duration = dto.Duration; 
                    booking.isPlayingAlone = dto.isPlayingAlone;
                    booking.Fellows = dto.Fellows;
                    booking.Status = dto.Status;

                    // Clear existing or update them individually
                    booking.Devices.Clear();

                    if (dto.Devices != null && dto.Devices.Count > 0)
                    {
                        foreach (var deviceDto in dto.Devices)
                        {
                            var device = await _deviceRepository.GetDeviceById(deviceDto.Id);
                            if (device != null)
                            {
                                booking.Devices.Add(device);
                            }
                            else
                            {
                                // Optionally handle the case where the device isn't found.
                                throw new KeyNotFoundException($"Device with ID {deviceDto.Id} not found.");
                            }
                        }
                    }
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

                // Send confirmation email
                await _emailService.SendBookingConfirmationEmailAsync(player.Email, subject, body);

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
        // Define room operating hours
        DateTime openTime = day.Date.AddHours(8);
        DateTime closeTime = day.Date.AddHours(20);

        // Fetch all bookings (you can also use a method that filters by day if available)
        var allBookings = await _repository.GetAllBookings();

        // Filter bookings for the specific day and that are not cancelled
        var dayBookings = allBookings
            .Where(b =>
                b.BookingDateTime.Date == day.Date &&
                b.Status != BookingStatus.Cancelled)
            .OrderBy(b => b.BookingDateTime)
            .ToList();

        var freeIntervals = new List<CalendarEventDto>();

        DateTime currentFreeStart = openTime;
        foreach (var booking in dayBookings)
        {
            DateTime bookingStart = booking.BookingDateTime;
            // If there is a gap between the current free start and the booking start, that is free.
            if (bookingStart > currentFreeStart)
            {
                freeIntervals.Add(new CalendarEventDto
                {
                    Start = currentFreeStart,
                    End = bookingStart,
                    Display = "background",
                    Color = "lightgreen"
                });
            }
            // Update the current free start to the later of what it was and the end of this booking.
            DateTime bookingEnd = booking.BookingDateTime.AddHours(booking.Duration);
            if (bookingEnd > currentFreeStart)
            {
                currentFreeStart = bookingEnd;
            }
        }

        // If there's a free interval between the end of the last booking and closing time, add it.
        if (currentFreeStart < closeTime)
        {
            freeIntervals.Add(new CalendarEventDto
            {
                Start = currentFreeStart,
                End = closeTime,
                Display = "background",
                Color = "lightgreen"
            });
        }

        return freeIntervals;
    } 

    private string GeneratePassCode()
        {
            // Generate a random 6-digit passcode
            Random random = new Random();
            return random.Next(100000, 999999).ToString();
        }
    }
}
