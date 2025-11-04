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
