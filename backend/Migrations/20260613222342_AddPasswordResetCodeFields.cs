using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace expenseDensify.Migrations
{
    /// <inheritdoc />
    public partial class AddPasswordResetCodeFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PasswordResetCodeExpiresUtc",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PasswordResetCodeHash",
                table: "users",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PasswordResetCodeExpiresUtc",
                table: "users");

            migrationBuilder.DropColumn(
                name: "PasswordResetCodeHash",
                table: "users");
        }
    }
}
