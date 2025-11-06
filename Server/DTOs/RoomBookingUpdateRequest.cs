using System.ComponentModel.DataAnnotations;
using gameroombookingsys.Enums;

namespace gameroombookingsys.DTOs
{
    public class RoomBookingUpdateRequest
    {
        [Required]
        public DateTime BookingDateTime { get; set; }

        [Required]
        public double Duration { get; set; }

        public bool isPlayingAlone { get; set; } = true;

        public int Fellows { get; set; } = 0;

        public List<int> DeviceIds { get; set; } = new List<int>();

        public BookingStatus? Status { get; set; }
    }
}


