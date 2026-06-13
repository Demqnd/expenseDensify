using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace expenseDensify.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Baseline migration: schema already exists from previous EnsureCreated startup.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No-op because this baseline migration does not create schema objects.
        }
    }
}
