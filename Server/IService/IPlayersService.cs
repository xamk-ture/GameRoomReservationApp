using gameroombookingsys.DTOs;

namespace gameroombookingsys.Interfaces
{
    public interface IPlayersService
    {
        Task<PlayerDto> GetPlayerByEmail(string email);
        Task<List<PlayerDto>> GetAllPlayers();
        Task<PlayerDto> UpdatePlayerInfo(PlayerDto playerDto);
        Task<PlayerDto> GetOrCreatePlayerByEmail(string email);
    }
}
