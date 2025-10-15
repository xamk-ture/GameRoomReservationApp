using System;
using System.Linq;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace gameroombookingsys.Helpers
{
    public class KeycloakHelper
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public KeycloakHelper(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public string GetUserEmail()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null) return null;

            // Log all claims for debugging purposes (or use a debugger)
            foreach (var claim in user.Claims)
            {
                Console.WriteLine($"Claim Type: {claim.Type}, Value: {claim.Value}");
            }

            // Try different claim names:
            var emailClaim = user.Claims.FirstOrDefault(c => c.Type.Equals("email", StringComparison.OrdinalIgnoreCase))
                             ?? user.Claims.FirstOrDefault(c => c.Type.Equals(ClaimTypes.Email, StringComparison.OrdinalIgnoreCase))
                             ?? user.Claims.FirstOrDefault(c => c.Type.Equals("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress", StringComparison.OrdinalIgnoreCase));
            return emailClaim?.Value;
        }

        public bool IsSchoolEmail(string email)
        {
            if (string.IsNullOrEmpty(email)) return false;
            return email.EndsWith("@edu.xamk.fi", StringComparison.OrdinalIgnoreCase)
                || email.EndsWith("@xamk.fi", StringComparison.OrdinalIgnoreCase);
        }
    }
}
