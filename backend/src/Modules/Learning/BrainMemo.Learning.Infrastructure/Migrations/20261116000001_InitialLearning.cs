using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrainMemo.Learning.Infrastructure.Migrations
{
    public partial class InitialLearning : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "lrn_block_completion",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    user_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    course_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    chapter_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    block_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    block_type = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    completed_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lrn_block_completion", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lrn_course_completion",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    user_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    course_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    completed_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lrn_course_completion", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lrn_bookmark",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    user_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    course_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    chapter_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lrn_bookmark", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lrn_outbox_event",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    event_type = table.Column<string>(type: "varchar(60)", maxLength: 60, nullable: false),
                    aggregate_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    payload = table.Column<string>(type: "json", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: false),
                    published_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: true),
                    attempt_count = table.Column<ushort>(type: "smallint unsigned", nullable: false),
                    last_error = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lrn_outbox_event", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "uk_lrn_block_completion_user_block",
                table: "lrn_block_completion",
                columns: new[] { "user_id", "block_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_lrn_block_completion_user_course",
                table: "lrn_block_completion",
                columns: new[] { "user_id", "course_id", "completed_at" });

            migrationBuilder.CreateIndex(
                name: "ix_lrn_block_completion_course_user",
                table: "lrn_block_completion",
                columns: new[] { "course_id", "user_id" });

            migrationBuilder.CreateIndex(
                name: "uk_lrn_course_completion_user_course",
                table: "lrn_course_completion",
                columns: new[] { "user_id", "course_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_lrn_course_completion_course",
                table: "lrn_course_completion",
                columns: new[] { "course_id", "completed_at" });

            migrationBuilder.CreateIndex(
                name: "uk_lrn_bookmark_user_course",
                table: "lrn_bookmark",
                columns: new[] { "user_id", "course_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_lrn_bookmark_user_updated",
                table: "lrn_bookmark",
                columns: new[] { "user_id", "updated_at" });

            migrationBuilder.CreateIndex(
                name: "ix_lrn_outbox_publish",
                table: "lrn_outbox_event",
                columns: new[] { "published_at", "created_at" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "lrn_block_completion");
            migrationBuilder.DropTable(name: "lrn_course_completion");
            migrationBuilder.DropTable(name: "lrn_bookmark");
            migrationBuilder.DropTable(name: "lrn_outbox_event");
        }
    }
}
