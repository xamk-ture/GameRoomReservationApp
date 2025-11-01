using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace gameroombookingsys.Migrations
{
    /// <inheritdoc />
    public partial class RemoveThemeFromPlayers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Theme",
                table: "Players");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Theme",
                table: "Players",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
