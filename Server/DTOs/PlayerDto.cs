using Gameroombookingsys.Models;

namespace gameroombookingsys.DTOs
{
    public class PlayerDto
    {
        public PlayerDto() { } // parameterless constructor for deserialization

        // Mapping constructor from Player entity
        public PlayerDto(Player player)
        {
            Id = player.Id;
            CreatedAt = player.CreatedAt;
            UpdatedAt = player.UpdatedAt;
            PictureUrl = player.PictureUrl;
            Email = player.Email;
            Theme = player.Theme;
        }

        public int Id { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string PictureUrl { get; set; }
        public string Email { get; set; }
        public string Theme { get; set; }
    }
}