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

        public async Task<List<AuthUser>> GetAllUsers()
        {
            return await _context.Users
                .OrderByDescending(u => u.LastLoginAt)
                .ToListAsync();
        }

        public async Task<int> DeleteUsers(IEnumerable<string> emails)
        {
            var list = (emails ?? Array.Empty<string>())
                .Where(e => !string.IsNullOrWhiteSpace(e))
                .Select(e => e.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            if (list.Count == 0) return 0;

            var executionStrategy = _context.Database.CreateExecutionStrategy();
            return await executionStrategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();

                // Find players by email
                var players = await _context.Players
                    .Where(p => list.Contains(p.Email))
                    .ToListAsync();

                if (players.Count > 0)
                {
                    var playerIds = players.Select(p => p.Id).ToList();

                    // Delete bookings for these players
                    var bookings = await _context.RoomBookings
                        .Where(b => playerIds.Contains(b.PlayerId))
                        .ToListAsync();
                    if (bookings.Count > 0)
                    {
                        _context.RoomBookings.RemoveRange(bookings);
                        await _context.SaveChangesAsync();
                    }

                    // Delete players
                    _context.Players.RemoveRange(players);
                    await _context.SaveChangesAsync();
                }

                // Finally delete users
                var users = await _context.Users
                    .Where(u => list.Contains(u.Email))
                    .ToListAsync();
                if (users.Count == 0)
                {
                    await transaction.CommitAsync();
                    return 0;
                }

                _context.Users.RemoveRange(users);
                var deleted = await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return deleted;
            });
        }
    }
}