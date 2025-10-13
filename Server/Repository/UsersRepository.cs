using Gameroombookingsys.Models;
using Microsoft.EntityFrameworkCore;
using gameroombookingsys.IRepository;
using gameroombookingsys;

namespace Gameroombookingsys.Repository
{
    public class UsersRepository : IUsersRepository
    {
        private readonly AppDbContext _context;
        private readonly ILogger<UsersRepository> _logger;

        public UsersRepository(AppDbContext context, ILogger<UsersRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<AuthUser?> GetUserByEmail(string email)
        {
            return await _context.Users.FindAsync(email);
        }

        public async Task<AuthUser> UpsertUser(string email)
        {
            var user = await _context.Users.FindAsync(email);
            var now = DateTime.UtcNow;

            if (user == null)
            {
                // Insert new user
                user = new AuthUser
                {
                    Email = email,
                    CreatedAt = now,
                    LastLoginAt = now
                };
                
                await _context.Users.AddAsync(user);
            }
            else
            {
                // Update existing user's last login time
                user.LastLoginAt = now;
                _context.Users.Update(user);
            }

            await _context.SaveChangesAsync();
            return user;
        }
    }
}