using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace gameroombookingsys.Migrations
{
    /// <inheritdoc />
    public partial class RemovePictureUrlFromPlayerModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Column doesn't exist in database, so this is a no-op migration
            // migrationBuilder.DropColumn(
            //     name: "PictureUrl",
            //     table: "Players");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PictureUrl",
                table: "Players",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
