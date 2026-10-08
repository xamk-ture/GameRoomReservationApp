using gameroombookingsys.DTOs;

namespace gameroombookingsys.Interfaces
{
    public interface IRoomBookingsService
    {
        Task<RoomBookingDto> BookGameRoom(RoomBookingDto dto);
        Task<RoomBookingDto> UpdateRoomBooking(int id, RoomBookingDto dto);
        Task<List<RoomBookingDto>> GetRoomBookingsByPlayerId(int playerId);
        Task<RoomBookingDto> GetRoomBookingById(int id);
        Task<List<RoomBookingDto>> GetAllBookings();
        Task<List<RoomBookingDto>> GetUpcomingBookings();
        Task<List<RoomBookingDto>> GetOngoingBookings();
        Task<List<RoomBookingDto>> GetHistoryBookings();
        Task<bool> DeleteBooking(int id);
        Task<bool> DeleteOwnBooking(int id);
        Task<List<CalendarEventDto>> GetFreeTimeEventsForDay(DateTime day);
        Task<List<CalendarEventDto>> GetFreeTimeEventsForDateRange(DateTime startDate, DateTime endDate);
        Task<List<DeviceAvailabilityDto>> GetDeviceAvailabilities(DateTime startTime, double duration);
    }
}
