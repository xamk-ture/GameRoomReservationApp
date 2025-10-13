using System;

namespace Gameroombookingsys.Models
{
    public class OneTimeLoginCode : BaseEntity
    {
        public string Email { get; set; }
        public string Code { get; set; }
        public DateTime ExpiresAt { get; set; }
    }
}
