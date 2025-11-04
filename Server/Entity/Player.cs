namespace Gameroombookingsys.Models
{
    public class Player : BaseEntity
    {
        public string Email { get; set; }
        public ICollection<RoomBooking> RoomBookings { get; set; } = new List<RoomBooking>();

    }
};