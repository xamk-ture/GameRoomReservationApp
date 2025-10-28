using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace gameroombookingsys.Migrations
{
    /// <inheritdoc />
    public partial class AddThemeToPlayers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add Theme column if it doesn't exist
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='Players' AND column_name='Theme'
                    ) THEN
                        ALTER TABLE ""Players"" ADD COLUMN ""Theme"" text NOT NULL DEFAULT 'light';
                    END IF;
                END
                $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop Theme column if it exists
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='Players' AND column_name='Theme'
                    ) THEN
                        ALTER TABLE ""Players"" DROP COLUMN ""Theme"";
                    END IF;
                END
                $$;
            ");
        }
    }
}
