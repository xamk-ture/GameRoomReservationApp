using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace gameroombookingsys.Migrations
{
    /// <inheritdoc />
    public partial class EnforcePlayerEmailUniqueAndFK : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1) Remove players with null/empty email to satisfy NOT NULL and FK
            migrationBuilder.Sql(@"
                DELETE FROM ""Players""
                WHERE ""Email"" IS NULL OR ""Email"" = '';
            ");

            // 2) Deduplicate players by Email, keep the smallest Id per email
            migrationBuilder.Sql(@"
                WITH ranked AS (
                    SELECT ""Id"", ""Email"",
                           ROW_NUMBER() OVER (PARTITION BY ""Email"" ORDER BY ""Id"") AS rn
                    FROM ""Players""
                    WHERE ""Email"" IS NOT NULL AND ""Email"" <> ''
                )
                DELETE FROM ""Players"" p
                USING ranked r
                WHERE p.""Id"" = r.""Id"" AND r.rn > 1;
            ");

            // 3) Backfill Users for any existing Players without a corresponding AuthUser row
            migrationBuilder.Sql(@"
                INSERT INTO ""Users"" (""Email"", ""CreatedAt"", ""LastLoginAt"")
                SELECT DISTINCT p.""Email"", NOW() AT TIME ZONE 'utc', NOW() AT TIME ZONE 'utc'
                FROM ""Players"" p
                LEFT JOIN ""Users"" u ON u.""Email"" = p.""Email""
                WHERE p.""Email"" IS NOT NULL AND p.""Email"" <> '' AND u.""Email"" IS NULL;
            ");

            // 4) Create unique index on Players.Email
            migrationBuilder.CreateIndex(
                name: "IX_Players_Email",
                table: "Players",
                column: "Email",
                unique: true);

            // 5) Add FK Players.Email -> Users.Email with RESTRICT
            migrationBuilder.AddForeignKey(
                name: "FK_Players_Users_Email",
                table: "Players",
                column: "Email",
                principalTable: "Users",
                principalColumn: "Email",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Players_Users_Email",
                table: "Players");

            migrationBuilder.DropIndex(
                name: "IX_Players_Email",
                table: "Players");
        }
    }
}
