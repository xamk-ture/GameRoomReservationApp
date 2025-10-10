using Gameroombookingsys.Models;

namespace gameroombookingsys.IRepository
{
    public interface IRoomBookingsRepository
    {
        Task<bool> IsRoomAvailable(DateTime startTime, double duration);
        Task<RoomBooking> AddRoomBooking(RoomBooking booking);
        Task<RoomBooking> GetRoomBookingById(int id);
        Task<RoomBooking> UpdateRoomBooking(RoomBooking booking);
        Task<List<RoomBooking>> GetRoomBookingsByPlayerId(int playerId);
        Task<List<RoomBooking>> GetAllBookings();
        Task DeleteRoomBooking(RoomBooking booking);

    }
}
