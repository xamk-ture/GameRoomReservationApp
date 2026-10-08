namespace gameroombookingsys.DTOs
{
    public class DeviceAvailabilityDto
    {
        public int DeviceId { get; set; }
        public string DeviceName { get; set; } = string.Empty;
        public int TotalQuantity { get; set; }
        public int AvailableQuantity { get; set; }
        public bool IsAvailable => AvailableQuantity > 0;
    }
}

