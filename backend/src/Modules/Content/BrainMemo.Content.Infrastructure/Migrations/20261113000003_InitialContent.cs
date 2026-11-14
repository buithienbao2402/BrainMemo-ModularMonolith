using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrainMemo.Content.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "cnt_chapter",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    course_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    position = table.Column<int>(type: "int", nullable: false),
                    title = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true),
                    status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    last_version_no = table.Column<int>(type: "int", nullable: false),
                    published_version_no = table.Column<int>(type: "int", nullable: true),
                    first_published_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: true),
                    last_published_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: true),
                    deleted_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cnt_chapter", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "cnt_chapter_version",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    chapter_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    version_no = table.Column<int>(type: "int", nullable: false),
                    snapshot = table.Column<string>(type: "json", nullable: false),
                    restored_from_version_no = table.Column<int>(type: "int", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: false),
                    published_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cnt_chapter_version", x => x.id);
                    table.ForeignKey(
                        name: "FK_cnt_chapter_version_cnt_chapter_chapter_id",
                        column: x => x.chapter_id,
                        principalTable: "cnt_chapter",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cnt_resource",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    course_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    kind = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    original_filename = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false),
                    content_type = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    storage_key = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cnt_resource", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "cnt_question_bank",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    course_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    difficulty_scheme = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cnt_question_bank", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "cnt_question",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    bank_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    question_type = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false),
                    allow_multiple = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    stem = table.Column<string>(type: "text", nullable: false),
                    explanation = table.Column<string>(type: "text", nullable: true),
                    reference_answer = table.Column<string>(type: "text", nullable: true),
                    difficulty_code = table.Column<byte>(type: "tinyint unsigned", nullable: true),
                    default_points = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: false),
                    status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    origin = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    ai_job_id = table.Column<Guid>(type: "binary(16)", nullable: true),
                    ai_item_no = table.Column<ushort>(type: "smallint unsigned", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cnt_question", x => x.id);
                    table.ForeignKey(
                        name: "FK_cnt_question_cnt_question_bank_bank_id",
                        column: x => x.bank_id,
                        principalTable: "cnt_question_bank",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "cnt_question_option",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    question_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    position = table.Column<ushort>(type: "smallint unsigned", nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    match_content = table.Column<string>(type: "text", nullable: true),
                    blank_no = table.Column<byte>(type: "tinyint unsigned", nullable: true),
                    is_correct = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cnt_question_option", x => x.id);
                    table.ForeignKey(
                        name: "FK_cnt_question_option_cnt_question_question_id",
                        column: x => x.question_id,
                        principalTable: "cnt_question",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cnt_question_tag",
                columns: table => new
                {
                    question_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    tag = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cnt_question_tag", x => new { x.question_id, x.tag });
                    table.ForeignKey(
                        name: "FK_cnt_question_tag_cnt_question_question_id",
                        column: x => x.question_id,
                        principalTable: "cnt_question",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cnt_block",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    chapter_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    block_type = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false),
                    position = table.Column<int>(type: "int", nullable: false),
                    title = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true),
                    body = table.Column<string>(type: "mediumtext", nullable: true),
                    resource_id = table.Column<Guid>(type: "binary(16)", nullable: true),
                    question_id = table.Column<Guid>(type: "binary(16)", nullable: true),
                    flashcards = table.Column<string>(type: "json", nullable: true),
                    ai_job_id = table.Column<Guid>(type: "binary(16)", nullable: true),
                    ai_review_status = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cnt_block", x => x.id);
                    table.ForeignKey(
                        name: "FK_cnt_block_cnt_chapter_chapter_id",
                        column: x => x.chapter_id,
                        principalTable: "cnt_chapter",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cnt_block_cnt_question_question_id",
                        column: x => x.question_id,
                        principalTable: "cnt_question",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_cnt_block_cnt_resource_resource_id",
                        column: x => x.resource_id,
                        principalTable: "cnt_resource",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "cnt_published_block",
                columns: table => new
                {
                    block_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    chapter_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    block_type = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false),
                    position = table.Column<int>(type: "int", nullable: false),
                    resource_id = table.Column<Guid>(type: "binary(16)", nullable: true),
                    question_id = table.Column<Guid>(type: "binary(16)", nullable: true),
                    version_no = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cnt_published_block", x => x.block_id);
                    table.ForeignKey(
                        name: "FK_cnt_published_block_cnt_chapter_chapter_id",
                        column: x => x.chapter_id,
                        principalTable: "cnt_chapter",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cnt_published_block_cnt_resource_resource_id",
                        column: x => x.resource_id,
                        principalTable: "cnt_resource",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "cnt_quiz_config",
                columns: table => new
                {
                    block_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    open_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: true),
                    close_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: true),
                    time_limit_minutes = table.Column<ushort>(type: "smallint unsigned", nullable: true),
                    max_attempts = table.Column<ushort>(type: "smallint unsigned", nullable: true),
                    pass_score = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: true),
                    result_display = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false),
                    shuffle_questions = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    shuffle_options = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    password_hash = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cnt_quiz_config", x => x.block_id);
                    table.ForeignKey(
                        name: "FK_cnt_quiz_config_cnt_block_block_id",
                        column: x => x.block_id,
                        principalTable: "cnt_block",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cnt_quiz_question",
                columns: table => new
                {
                    quiz_block_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    question_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    position = table.Column<int>(type: "int", nullable: false),
                    points = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cnt_quiz_question", x => new { x.quiz_block_id, x.question_id });
                    table.ForeignKey(
                        name: "FK_cnt_quiz_question_cnt_block_quiz_block_id",
                        column: x => x.quiz_block_id,
                        principalTable: "cnt_block",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cnt_quiz_question_cnt_question_question_id",
                        column: x => x.question_id,
                        principalTable: "cnt_question",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "cnt_quiz_random_rule",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    quiz_block_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    position = table.Column<ushort>(type: "smallint unsigned", nullable: false),
                    pick_count = table.Column<ushort>(type: "smallint unsigned", nullable: false),
                    points_each = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: false),
                    filter_tag = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true),
                    filter_difficulty_code = table.Column<byte>(type: "tinyint unsigned", nullable: true),
                    filter_question_type = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cnt_quiz_random_rule", x => x.id);
                    table.ForeignKey(
                        name: "FK_cnt_quiz_random_rule_cnt_block_quiz_block_id",
                        column: x => x.quiz_block_id,
                        principalTable: "cnt_block",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cnt_quiz_prerequisite",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    quiz_block_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    target_kind = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    target_id = table.Column<Guid>(type: "binary(16)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cnt_quiz_prerequisite", x => x.id);
                    table.ForeignKey(
                        name: "FK_cnt_quiz_prerequisite_cnt_block_quiz_block_id",
                        column: x => x.quiz_block_id,
                        principalTable: "cnt_block",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cnt_quiz_exception",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    course_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    quiz_block_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    user_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    extra_minutes = table.Column<ushort>(type: "smallint unsigned", nullable: true),
                    extra_attempts = table.Column<ushort>(type: "smallint unsigned", nullable: true),
                    extended_close_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cnt_quiz_exception", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "cnt_assignment_config",
                columns: table => new
                {
                    block_id = table.Column<Guid>(type: "binary(16)", nullable: false),
                    due_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: true),
                    max_points = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: true),
                    max_file_size_bytes = table.Column<uint>(type: "int unsigned", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "datetime(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cnt_assignment_config", x => x.block_id);
                    table.ForeignKey(
                        name: "FK_cnt_assignment_config_cnt_block_block_id",
                        column: x => x.block_id,
                        principalTable: "cnt_block",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_cnt_chapter_course_pos",
                table: "cnt_chapter",
                columns: new[] { "course_id", "deleted_at", "position" });

            migrationBuilder.CreateIndex(
                name: "ix_cnt_chapter_course_status",
                table: "cnt_chapter",
                columns: new[] { "course_id", "status", "deleted_at" });

            migrationBuilder.CreateIndex(
                name: "uk_cnt_chapter_version",
                table: "cnt_chapter_version",
                columns: new[] { "chapter_id", "version_no" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_cnt_chapter_version_published",
                table: "cnt_chapter_version",
                columns: new[] { "chapter_id", "published_at" });

            migrationBuilder.CreateIndex(
                name: "uk_cnt_resource_storage_key",
                table: "cnt_resource",
                column: "storage_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_cnt_resource_course",
                table: "cnt_resource",
                columns: new[] { "course_id", "deleted_at", "created_at" });

            migrationBuilder.CreateIndex(
                name: "uk_cnt_question_bank_course",
                table: "cnt_question_bank",
                column: "course_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uk_cnt_question_ai_item",
                table: "cnt_question",
                columns: new[] { "ai_job_id", "ai_item_no" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_cnt_question_bank_status_type",
                table: "cnt_question",
                columns: new[] { "bank_id", "status", "question_type" });

            migrationBuilder.CreateIndex(
                name: "ix_cnt_question_bank_difficulty",
                table: "cnt_question",
                columns: new[] { "bank_id", "difficulty_code" });

            migrationBuilder.CreateIndex(
                name: "ix_cnt_question_option_question",
                table: "cnt_question_option",
                columns: new[] { "question_id", "position" });

            migrationBuilder.CreateIndex(
                name: "ix_cnt_question_tag_tag",
                table: "cnt_question_tag",
                columns: new[] { "tag", "question_id" });

            migrationBuilder.CreateIndex(
                name: "uk_cnt_block_ai_job",
                table: "cnt_block",
                column: "ai_job_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_cnt_block_chapter_pos",
                table: "cnt_block",
                columns: new[] { "chapter_id", "position" });

            migrationBuilder.CreateIndex(
                name: "ix_cnt_block_resource",
                table: "cnt_block",
                column: "resource_id");

            migrationBuilder.CreateIndex(
                name: "ix_cnt_block_question",
                table: "cnt_block",
                column: "question_id");

            migrationBuilder.CreateIndex(
                name: "ix_cnt_published_block_chapter_pos",
                table: "cnt_published_block",
                columns: new[] { "chapter_id", "position" });

            migrationBuilder.CreateIndex(
                name: "ix_cnt_published_block_resource",
                table: "cnt_published_block",
                column: "resource_id");

            migrationBuilder.CreateIndex(
                name: "ix_cnt_quiz_question_question",
                table: "cnt_quiz_question",
                column: "question_id");

            migrationBuilder.CreateIndex(
                name: "ix_cnt_quiz_random_rule_block",
                table: "cnt_quiz_random_rule",
                columns: new[] { "quiz_block_id", "position" });

            migrationBuilder.CreateIndex(
                name: "uk_cnt_quiz_prerequisite",
                table: "cnt_quiz_prerequisite",
                columns: new[] { "quiz_block_id", "target_kind", "target_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uk_cnt_quiz_exception_block_user",
                table: "cnt_quiz_exception",
                columns: new[] { "quiz_block_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_cnt_quiz_exception_course",
                table: "cnt_quiz_exception",
                column: "course_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "cnt_assignment_config");
            migrationBuilder.DropTable(name: "cnt_quiz_exception");
            migrationBuilder.DropTable(name: "cnt_quiz_prerequisite");
            migrationBuilder.DropTable(name: "cnt_quiz_random_rule");
            migrationBuilder.DropTable(name: "cnt_quiz_question");
            migrationBuilder.DropTable(name: "cnt_quiz_config");
            migrationBuilder.DropTable(name: "cnt_published_block");
            migrationBuilder.DropTable(name: "cnt_block");
            migrationBuilder.DropTable(name: "cnt_question_tag");
            migrationBuilder.DropTable(name: "cnt_question_option");
            migrationBuilder.DropTable(name: "cnt_question");
            migrationBuilder.DropTable(name: "cnt_question_bank");
            migrationBuilder.DropTable(name: "cnt_resource");
            migrationBuilder.DropTable(name: "cnt_chapter_version");
            migrationBuilder.DropTable(name: "cnt_chapter");
        }
    }
}
