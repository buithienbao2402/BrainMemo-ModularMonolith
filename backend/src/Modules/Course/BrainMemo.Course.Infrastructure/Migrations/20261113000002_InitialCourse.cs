using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrainMemo.Course.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCourse : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "crs_course",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    owner_user_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    cover_storage_key = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true),
                    access_mode = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    hidden_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: true),
                    hidden_sanction_id = table.Column<Guid>(type: "binary(16)", nullable: true),
                    deleted_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: true),
                    revision = table.Column<uint>(type: "int unsigned", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crs_course", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "crs_course_tag",
                columns: table => new
                {
                    course_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    tag = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crs_course_tag", x => new { x.course_id, x.tag });
                    table.ForeignKey(
                        name: "FK_crs_course_tag_crs_course_course_id",
                        column: x => x.course_id,
                        principalTable: "crs_course",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "crs_enrollment",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    course_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    user_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    status = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false),
                    first_enrolled_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: true),
                    status_changed_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crs_enrollment", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "crs_enrollment_request",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    course_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    user_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    decision = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    requested_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: false),
                    decided_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: true),
                    decided_by_user_id = table.Column<Guid>(type: "binary(16)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crs_enrollment_request", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "crs_chapter_access",
                columns: table => new
                {
                    chapter_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    course_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    access_mode = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    passcode_hash = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true),
                    passcode_version = table.Column<uint>(type: "int unsigned", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crs_chapter_access", x => x.chapter_id);
                });

            migrationBuilder.CreateTable(
                name: "crs_chapter_unlock",
                columns: table => new
                {
                    chapter_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    user_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    passcode_version = table.Column<uint>(type: "int unsigned", nullable: false),
                    unlocked_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crs_chapter_unlock", x => new { x.chapter_id, x.user_id });
                });

            migrationBuilder.CreateTable(
                name: "crs_nomination",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    course_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    user_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    nominated_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: false),
                    withdrawn_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_crs_nomination", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "crs_outbox_event",
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
                    table.PrimaryKey("PK_crs_outbox_event", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_crs_course_owner",
                table: "crs_course",
                columns: new[] { "owner_user_id", "deleted_at", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_crs_course_tag_tag",
                table: "crs_course_tag",
                columns: new[] { "tag", "course_id" });

            migrationBuilder.CreateIndex(
                name: "uk_crs_enrollment_course_user",
                table: "crs_enrollment",
                columns: new[] { "course_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_crs_enrollment_course_status",
                table: "crs_enrollment",
                columns: new[] { "course_id", "status", "status_changed_at" });

            migrationBuilder.CreateIndex(
                name: "ix_crs_enrollment_user_status",
                table: "crs_enrollment",
                columns: new[] { "user_id", "status", "status_changed_at" });

            migrationBuilder.CreateIndex(
                name: "ix_crs_enrollment_request_decision",
                table: "crs_enrollment_request",
                columns: new[] { "course_id", "decision", "requested_at" });

            migrationBuilder.CreateIndex(
                name: "ix_crs_chapter_access_course",
                table: "crs_chapter_access",
                column: "course_id");

            migrationBuilder.CreateIndex(
                name: "ix_crs_chapter_unlock_user",
                table: "crs_chapter_unlock",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_crs_nomination_course_time",
                table: "crs_nomination",
                columns: new[] { "course_id", "nominated_at" });

            migrationBuilder.CreateIndex(
                name: "ix_crs_outbox_publish",
                table: "crs_outbox_event",
                columns: new[] { "published_at", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "crs_course_tag");
            migrationBuilder.DropTable(name: "crs_course");
            migrationBuilder.DropTable(name: "crs_enrollment");
            migrationBuilder.DropTable(name: "crs_enrollment_request");
            migrationBuilder.DropTable(name: "crs_chapter_access");
            migrationBuilder.DropTable(name: "crs_chapter_unlock");
            migrationBuilder.DropTable(name: "crs_nomination");
            migrationBuilder.DropTable(name: "crs_outbox_event");
        }
    }
}
