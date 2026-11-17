using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrainMemo.Messaging.Infrastructure.Migrations
{
    public partial class InitialMessaging : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "msg_conversation",
                columns: table => new
                {
                    id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    course_id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    student_user_id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    instructor_user_id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    last_message_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: false),
                    last_message_preview = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_msg_conversation", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "msg_message",
                columns: table => new
                {
                    id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    conversation_id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    sender_user_id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    content = table.Column<string>(type: "text", nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    attachment_storage_key = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    read_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "datetime(3)", precision: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_msg_message", x => x.id);
                    table.ForeignKey(
                        name: "FK_msg_message_msg_conversation_conversation_id",
                        column: x => x.conversation_id,
                        principalTable: "msg_conversation",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateIndex(
                name: "uk_msg_conv_course_student_instructor",
                table: "msg_conversation",
                columns: new[] { "course_id", "student_user_id", "instructor_user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_msg_message_conv_time",
                table: "msg_message",
                columns: new[] { "conversation_id", "created_at" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "msg_message");
            migrationBuilder.DropTable(name: "msg_conversation");
        }
    }
}
