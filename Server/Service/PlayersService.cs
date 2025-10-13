using Gameroombookingsys.Models;
using System.Threading.Tasks;
using gameroombookingsys.DTOs;
using gameroombookingsys.Interfaces;
using gameroombookingsys.IRepository;
using Gameroombookingsys.Repository;

namespace Gameroombookingsys.Services
{
    public class PlayersService : IPlayersService
    {
        private readonly IPlayersRepository _playerRepository;
        private readonly ILogger<PlayersService> _logger;

        public PlayersService(IPlayersRepository playerRepository)
        {
            _playerRepository = playerRepository;
        }

        public async Task<PlayerDto> GetPlayerByEmail(string email)
        {
            var player = await _playerRepository.GetPlayerByEmail(email);
            if (player == null)
                return null;

            return new PlayerDto(player);
        }

        public async Task<PlayerDto> GetOrCreatePlayerByEmail(string email)
        {
            var player = await _playerRepository.GetPlayerByEmail(email);
            if (player == null)
            {
                player = await _playerRepository.AddPlayer(new Player
                {
                    Email = email,
                    Theme = "light",
                    PictureUrl = string.Empty,
                });
            }

            return new PlayerDto(player);
        }

        public async Task<List<PlayerDto>> GetAllPlayers()
        {
            var players = await _playerRepository.GetAllPlayers();
            return players.Select(p => new PlayerDto(p)).ToList();
        }
        public async Task<PlayerDto> UpdatePlayerInfo(PlayerDto playerDto)
        {
            try
            { 
                var player = await _playerRepository.GetPlayerByEmail(playerDto.Email);
                if (player == null)
                    throw new KeyNotFoundException("Player not found.");

                // Update fields
                player.PictureUrl = playerDto.PictureUrl;
                player.Theme = playerDto.Theme;

                var updatedPlayer = await _playerRepository.UpdatePlayer(player);

                return new PlayerDto(updatedPlayer);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating player info in service.");
                throw new Exception("Error updating player info in service.", ex);
            }
        }
    }
}
