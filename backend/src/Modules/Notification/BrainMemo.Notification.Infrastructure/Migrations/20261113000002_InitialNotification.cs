using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrainMemo.Notification.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialNotification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ntf_announcement",
                columns: table => new
                {
                    id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    title = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    body = table.Column<string>(type: "text", nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_by_user_id = table.Column<byte[]>(type: "binary(16)", nullable: false, comment: "logical ref idn_user.id (Admin)"),
                    dispatch_status = table.Column<string>(type: "enum('PENDING','COMPLETED')", nullable: false, defaultValue: "PENDING", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    recipient_count = table.Column<int>(type: "int", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(3)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(3)"),
                    dispatched_at = table.Column<DateTime>(type: "datetime(3)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ntf_announcement", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "ntf_email_delivery",
                columns: table => new
                {
                    id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    source_event_id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    template = table.Column<string>(type: "enum('VERIFY_EMAIL','RESET_PASSWORD','ACCOUNT_LOCKED')", nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    recipient_user_id = table.Column<byte[]>(type: "binary(16)", nullable: false, comment: "logical ref idn_user.id"),
                    status = table.Column<string>(type: "enum('PENDING','SENT','FAILED')", nullable: false, defaultValue: "PENDING", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    attempt_count = table.Column<sbyte>(type: "tinyint", nullable: false, defaultValue: (sbyte)0),
                    next_attempt_at = table.Column<DateTime>(type: "datetime(3)", nullable: true),
                    last_attempt_at = table.Column<DateTime>(type: "datetime(3)", nullable: true),
                    last_error = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    sent_at = table.Column<DateTime>(type: "datetime(3)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(3)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(3)")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ntf_email_delivery", x => x.id);
                    table.CheckConstraint("ck_ntf_email_sent", "(status = 'SENT') = (sent_at IS NOT NULL)");
                    table.CheckConstraint("ck_ntf_email_token_templates", "template NOT IN ('VERIFY_EMAIL','RESET_PASSWORD') OR next_attempt_at IS NULL");
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "ntf_notification",
                columns: table => new
                {
                    id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    recipient_user_id = table.Column<byte[]>(type: "binary(16)", nullable: false, comment: "logical ref idn_user.id"),
                    type = table.Column<string>(type: "enum('ENROLLMENT_INVITE_JOIN','ENROLLMENT','COMMENT','GRADE_FEEDBACK','NEW_CHAPTER','REPORT_RESULT','SANCTION','SYSTEM_ANNOUNCEMENT')", nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    payload = table.Column<string>(type: "json", nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    source_event_id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    announcement_id = table.Column<byte[]>(type: "binary(16)", nullable: true),
                    read_at = table.Column<DateTime>(type: "datetime(3)", nullable: true),
                    deleted_at = table.Column<DateTime>(type: "datetime(3)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(3)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(3)")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ntf_notification", x => x.id);
                    table.CheckConstraint("ck_ntf_notification_announcement", "(type = 'SYSTEM_ANNOUNCEMENT') = (announcement_id IS NOT NULL)");
                    table.ForeignKey(
                        name: "fk_ntf_notification_announcement",
                        column: x => x.announcement_id,
                        principalTable: "ntf_announcement",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateIndex(
                name: "ix_ntf_announcement_dispatch",
                table: "ntf_announcement",
                columns: new[] { "dispatch_status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_ntf_email_retry",
                table: "ntf_email_delivery",
                columns: new[] { "status", "next_attempt_at" });

            migrationBuilder.CreateIndex(
                name: "uk_ntf_email_event_template",
                table: "ntf_email_delivery",
                columns: new[] { "source_event_id", "template" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_ntf_notification_announcement",
                table: "ntf_notification",
                column: "announcement_id");

            migrationBuilder.CreateIndex(
                name: "ix_ntf_notification_inbox",
                table: "ntf_notification",
                columns: new[] { "recipient_user_id", "deleted_at", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_ntf_notification_unread",
                table: "ntf_notification",
                columns: new[] { "recipient_user_id", "read_at", "deleted_at" });

            migrationBuilder.CreateIndex(
                name: "uk_ntf_notification_event_recipient",
                table: "ntf_notification",
                columns: new[] { "source_event_id", "recipient_user_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ntf_notification");

            migrationBuilder.DropTable(
                name: "ntf_email_delivery");

            migrationBuilder.DropTable(
                name: "ntf_announcement");
        }
    }
}
