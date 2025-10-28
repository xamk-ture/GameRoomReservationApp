using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace gameroombookingsys.Migrations
{
    /// <inheritdoc />
    public partial class UpdateDatabaseSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Make drops idempotent in case columns were manually removed already
            migrationBuilder.Sql(@"ALTER TABLE ""Players"" DROP COLUMN IF EXISTS ""PhoneNumber"";");
            migrationBuilder.Sql(@"ALTER TABLE ""Players"" DROP COLUMN IF EXISTS ""Username"";");

            // Create Users table only if it does not already exist
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""Users"" (
    ""Email"" text NOT NULL,
    ""CreatedAt"" timestamp with time zone NOT NULL,
    ""LastLoginAt"" timestamp with time zone NOT NULL,
    CONSTRAINT ""PK_Users"" PRIMARY KEY (""Email"")
);
");

            // Ensure unique index on Players.Email exists
            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'IX_Players_Email'
          AND n.nspname = 'public'
    ) THEN
        CREATE UNIQUE INDEX ""IX_Players_Email"" ON ""Players"" (""Email"");
    END IF;
END$$;
");

            // Ensure FK from Players.Email to Users.Email exists
            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_Players_Users_Email'
    ) THEN
        ALTER TABLE ""Players""
        ADD CONSTRAINT ""FK_Players_Users_Email""
        FOREIGN KEY (""Email"") REFERENCES ""Users"" (""Email"")
        ON DELETE RESTRICT;
    END IF;
END$$;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Players_Users_Email",
                table: "Players");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Players_Email",
                table: "Players");

            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber",
                table: "Players",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Username",
                table: "Players",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
