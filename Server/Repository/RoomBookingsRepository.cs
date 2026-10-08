using gameroombookingsys.DTOs;
using gameroombookingsys.Enums;
using gameroombookingsys.IRepository;
using Gameroombookingsys.Models;
using Microsoft.EntityFrameworkCore;

namespace gameroombookingsys.Repository
{
    public class RoomBookingsRepository : IRoomBookingsRepository
    {
        private readonly AppDbContext _context;
        private readonly ILogger<RoomBookingsRepository> _logger;

        public RoomBookingsRepository(AppDbContext context, ILogger<RoomBookingsRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<bool> IsRoomAvailable(DateTime startTime, double duration)
        {
            var requestedEndTime = startTime.AddHours(duration);

            // First, filter bookings that might overlap based on the start time and status
            var bookings = await _context.RoomBookings
                .Where(b => b.BookingDateTime < requestedEndTime &&
                            b.Status != BookingStatus.Cancelled)
                .ToListAsync();

            // Then, use client evaluation (LINQ-to-Objects) to check for overlap
            bool overlapExists = bookings.Any(b => b.BookingDateTime.AddHours(b.Duration) > startTime);

            return !overlapExists;
        }

        public async Task<bool> IsDeviceAvailable(DateTime startTime, double duration, int deviceId)
        {
            var requestedEndTime = startTime.AddHours(duration);

            var device = await _context.Devices.FirstOrDefaultAsync(d => d.Id == deviceId);
            if (device == null || (device.Quantity ?? 0) <= 0)
            {
                return false;
            }

            // Fetch bookings that overlap the requested window and include their devices
            var overlappingBookings = await _context.RoomBookings
                .Include(b => b.Devices)
                .Where(b => b.Status != BookingStatus.Cancelled &&
                            b.BookingDateTime < requestedEndTime)
                .ToListAsync();

            // Count how many of these overlapping bookings actually overlap in time and use the same device
            int concurrentCount = overlappingBookings
                .Count(b => b.BookingDateTime.AddHours(b.Duration) > startTime &&
                            b.Devices.Any(d => d.Id == deviceId));

            return concurrentCount < (device.Quantity ?? 0);
        }

        public async Task<bool> IsDeviceAvailableExcludingBooking(DateTime startTime, double duration, int deviceId, int excludeBookingId)
        {
            var requestedEndTime = startTime.AddHours(duration);

            var device = await _context.Devices.FirstOrDefaultAsync(d => d.Id == deviceId);
            if (device == null || (device.Quantity ?? 0) <= 0)
            {
                return false;
            }

            // Fetch bookings that overlap the requested window and include their devices, excluding the specified booking
            var overlappingBookings = await _context.RoomBookings
                .Include(b => b.Devices)
                .Where(b => b.Status != BookingStatus.Cancelled &&
                            b.Id != excludeBookingId &&
                            b.BookingDateTime < requestedEndTime)
                .ToListAsync();

            // Count how many of these overlapping bookings actually overlap in time and use the same device
            int concurrentCount = overlappingBookings
                .Count(b => b.BookingDateTime.AddHours(b.Duration) > startTime &&
                            b.Devices.Any(d => d.Id == deviceId));

            return concurrentCount < (device.Quantity ?? 0);
        }

        public async Task<List<DeviceAvailabilityDto>> GetDeviceAvailabilities(DateTime startTime, double duration)
        {
            try
            {
                var requestedEndTime = startTime.AddHours(duration);

                // Get all devices
                var allDevices = await _context.Devices.ToListAsync();
                _logger.LogInformation("GetDeviceAvailabilities: Found {Count} devices, startTime: {StartTime}, duration: {Duration}", 
                    allDevices.Count, startTime, duration);

                // Fetch bookings that might overlap the requested window
                var overlappingBookings = await _context.RoomBookings
                    .Include(b => b.Devices)
                    .Where(b => b.Status != BookingStatus.Cancelled &&
                                b.BookingDateTime < requestedEndTime)
                    .ToListAsync();

                _logger.LogInformation("GetDeviceAvailabilities: Found {Count} overlapping bookings", overlappingBookings.Count);

                var availabilities = new List<DeviceAvailabilityDto>();

                _logger.LogInformation("GetDeviceAvailabilities: Processing {DeviceCount} devices", allDevices.Count);
                
                foreach (var device in allDevices)
                {
                    if (device == null)
                    {
                        _logger.LogWarning("GetDeviceAvailabilities: Skipping null device");
                        continue;
                    }
                    
                    var totalQuantity = device.Quantity ?? 0;
                    _logger.LogDebug("GetDeviceAvailabilities: Processing device {DeviceId} ({DeviceName}), quantity: {Quantity}", 
                        device.Id, device.Name, totalQuantity);
                    
                    // Count how many bookings use this device during the requested time
                    // Safely handle null Devices collections
                    int bookedCount = overlappingBookings
                        .Where(b => b != null && 
                                    b.BookingDateTime.AddHours(b.Duration) > startTime &&
                                    b.Devices != null)
                        .Count(b => b.Devices.Any(d => d != null && d.Id == device.Id));

                    int availableQuantity = Math.Max(0, totalQuantity - bookedCount);

                    var availabilityDto = new DeviceAvailabilityDto
                    {
                        DeviceId = device.Id,
                        DeviceName = device.Name ?? $"Device {device.Id}",
                        TotalQuantity = totalQuantity,
                        AvailableQuantity = availableQuantity
                    };
                    
                    availabilities.Add(availabilityDto);
                    _logger.LogDebug("GetDeviceAvailabilities: Added availability for device {DeviceId}: {Available}/{Total}", 
                        device.Id, availableQuantity, totalQuantity);
                }

                _logger.LogInformation("GetDeviceAvailabilities: Returning {Count} availabilities", availabilities.Count);
                return availabilities;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDeviceAvailabilities. startTime: {StartTime}, duration: {Duration}", startTime, duration);
                // Return empty list instead of throwing to prevent 500 errors
                return new List<DeviceAvailabilityDto>();
            }
        }

        public async Task<RoomBooking> AddRoomBooking(RoomBooking booking)
        {
            try
            {
                _context.RoomBookings.Add(booking);
                await _context.SaveChangesAsync();
                return booking;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding room booking in repository.");
                throw;
            }
        }

        public async Task DeleteRoomBooking(RoomBooking booking)
        {
            try
            {
                _context.RoomBookings.Remove(booking);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting room booking.");
                throw;
            }
        }



        public async Task<RoomBooking> GetRoomBookingById(int id)
        {
            var booking = await _context.RoomBookings
                .Include(rb => rb.Devices)
                .Include(rb => rb.Player)
                .FirstOrDefaultAsync(rb => rb.Id == id);
            if (booking == null)
                throw new KeyNotFoundException($"Room booking with id {id} not found.");
            return booking;
        }



        public async Task<RoomBooking> UpdateRoomBooking(RoomBooking booking)
        {
            try
            {
                _context.RoomBookings.Update(booking);
                await _context.SaveChangesAsync();
                return booking;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating room booking in repository.");
                throw;
            }
        }

        public async Task<List<RoomBooking>> GetRoomBookingsByPlayerId(int playerId)
        {
            try
            {
                var bookingsByPlayerId = await _context.RoomBookings
                    .Include(rb => rb.Devices) 
                    .Where(b => b.PlayerId == playerId)
                    .ToListAsync();

                return bookingsByPlayerId;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving room booking for player with ID {playerId}.");
                throw;
            }
        }


        // Returns all RoomBooking entities from the database.
        public async Task<List<RoomBooking>> GetAllBookings()
        {
            try
            {
                return await _context.RoomBookings
                    .Include(rb => rb.Devices)
                    .Include(rb => rb.Player)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving all room bookings from the database.");
                throw;
            }
        }
    }
}
