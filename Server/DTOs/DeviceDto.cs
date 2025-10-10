using gameroombookingsys.Enums;
using Gameroombookingsys.Models;

namespace gameroombookingsys.DTOs
{
    public class DeviceDto
    {
        public DeviceDto() { } // parameterless constructor for deserialization

        // Mapping constructor from Device entity
        public DeviceDto(Device device)
        {
            Id = device.Id;
            CreatedAt = device.CreatedAt;
            UpdatedAt = device.UpdatedAt;
            Name = device.Name;
            Description = device.Description;
            Quantity = device.Quantity;
            Status = device.Status;
            PlayerId = device.PlayerId; 
        }
        public int Id { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public int? Quantity { get; set; }
        public DeviceStatus? Status { get; set; }
        public int? PlayerId { get; set; }
    }
}