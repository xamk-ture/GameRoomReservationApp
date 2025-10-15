using Gameroombookingsys.Models;
using Microsoft.EntityFrameworkCore;
using gameroombookingsys;
using gameroombookingsys.IRepository;
using gameroombookingsys.Service;

namespace Gameroombookingsys.Repository
{
    public class PlayersRepository : IPlayersRepository
    {
        private readonly AppDbContext _context;
        private readonly ILogger<PlayersRepository> _logger;

        public PlayersRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Player> GetPlayerById(int playerId)
        {
            try
            {
                var player = await _context.Players.FindAsync(playerId);
                if (player == null)
                {
                    throw new KeyNotFoundException($"Player with id {playerId} not found.");
                }
                return player;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving player with id {playerId}.");
                throw new Exception($"An error occurred while retrieving player with id {playerId}.", ex);
            }
        }


        public async Task<Player> GetPlayerByEmail(string email)
        {
            var playerByEmail = await _context.Players.FirstOrDefaultAsync(p => p.Email == email);
            return playerByEmail;
        }

        public async Task<List<Player>> GetAllPlayers()
        {
            var players = await _context.Players.ToListAsync();
            return players;
        }
        public async Task<Player> UpdatePlayer(Player player)
        {
            try
            {
                _context.Players.Update(player);
                await _context.SaveChangesAsync();
                return player;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating player in repository.");
                throw new Exception("Error updating player in repository.", ex);
            }
        }

        public async Task<Player> AddPlayer(Player player)
        {
            try
            {
                _context.Players.Add(player);
                await _context.SaveChangesAsync();
                return player;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding player in repository.");
                throw new Exception("Error adding player in repository.", ex);
            }
        }

    }
}
