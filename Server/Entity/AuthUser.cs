using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gameroombookingsys.Models
{
    // Authentication account used for OTP login tracking. Domain profile is Player.
    [Table("Users")] // keep table name Users
    public class AuthUser
    {
        [Key]
        public string Email { get; set; } = default!;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastLoginAt { get; set; } = DateTime.UtcNow;
    }
}
