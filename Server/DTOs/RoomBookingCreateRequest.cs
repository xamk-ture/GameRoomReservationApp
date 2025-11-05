using System.ComponentModel.DataAnnotations;

namespace gameroombookingsys.DTOs
{
    public class RoomBookingCreateRequest
    {
        [Required]
        public DateTime BookingDateTime { get; set; }

        [Required]
        public double Duration { get; set; }

        public bool isPlayingAlone { get; set; } = true;

        public int Fellows { get; set; } = 0;

        public List<int> DeviceIds { get; set; } = new List<int>();

        // Optional: Admin can specify playerId when creating booking for another user
        public int? PlayerId { get; set; }
    }
}


