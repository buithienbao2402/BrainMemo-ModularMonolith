using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrainMemo.Identity.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialIdentity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "idn_user",
                columns: table => new
                {
                    id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    email = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    password_hash = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    email_verified_at = table.Column<DateTime>(type: "datetime(3)", nullable: true),
                    account_status = table.Column<string>(type: "enum('ACTIVE','LOCKED_TEMPORARY','LOCKED_PERMANENT')", nullable: false, defaultValue: "ACTIVE", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    locked_at = table.Column<DateTime>(type: "datetime(3)", nullable: true),
                    locked_until = table.Column<DateTime>(type: "datetime(3)", nullable: true),
                    lock_reason = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    lock_sanction_id = table.Column<byte[]>(type: "binary(16)", nullable: true, comment: "logical ref mod_sanction.id"),
                    created_at = table.Column<DateTime>(type: "datetime(3)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(3)"),
                    updated_at = table.Column<DateTime>(type: "datetime(3)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_idn_user", x => x.id);
                    table.CheckConstraint("ck_idn_user_lock", "(account_status = 'ACTIVE' AND locked_at IS NULL AND locked_until IS NULL AND lock_reason IS NULL AND lock_sanction_id IS NULL) OR (account_status = 'LOCKED_TEMPORARY' AND locked_at IS NOT NULL AND locked_until IS NOT NULL AND lock_reason IS NOT NULL) OR (account_status = 'LOCKED_PERMANENT' AND locked_until IS NULL AND locked_at IS NOT NULL AND lock_reason IS NOT NULL)");
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "idn_admin_grant",
                columns: table => new
                {
                    id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    user_id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    granted_at = table.Column<DateTime>(type: "datetime(3)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(3)"),
                    granted_by_user_id = table.Column<byte[]>(type: "binary(16)", nullable: true, comment: "NULL = seed"),
                    revoked_at = table.Column<DateTime>(type: "datetime(3)", nullable: true),
                    revoked_by_user_id = table.Column<byte[]>(type: "binary(16)", nullable: true),
                    active_marker = table.Column<sbyte>(type: "tinyint", nullable: true, computedColumnSql: "CASE WHEN revoked_at IS NULL THEN 1 ELSE NULL END", stored: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_idn_admin_grant", x => x.id);
                    table.CheckConstraint("ck_idn_admin_grant_revoke", "revoked_at IS NOT NULL OR revoked_by_user_id IS NULL");
                    table.ForeignKey(
                        name: "fk_idn_admin_grant_granted_by",
                        column: x => x.granted_by_user_id,
                        principalTable: "idn_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_idn_admin_grant_revoked_by",
                        column: x => x.revoked_by_user_id,
                        principalTable: "idn_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_idn_admin_grant_user",
                        column: x => x.user_id,
                        principalTable: "idn_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "idn_external_identity",
                columns: table => new
                {
                    id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    user_id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    provider = table.Column<string>(type: "enum('GOOGLE')", nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    provider_subject = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime(3)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(3)")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_idn_external_identity", x => x.id);
                    table.ForeignKey(
                        name: "fk_idn_ext_user",
                        column: x => x.user_id,
                        principalTable: "idn_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "idn_refresh_session",
                columns: table => new
                {
                    id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    user_id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    token_hash = table.Column<byte[]>(type: "binary(32)", maxLength: 32, nullable: false),
                    user_agent = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ip_address = table.Column<string>(type: "varchar(45)", maxLength: 45, nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime(3)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(3)"),
                    last_used_at = table.Column<DateTime>(type: "datetime(3)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(3)"),
                    expires_at = table.Column<DateTime>(type: "datetime(3)", nullable: false),
                    revoked_at = table.Column<DateTime>(type: "datetime(3)", nullable: true),
                    revoke_reason = table.Column<string>(type: "enum('LOGOUT','USER_REVOKED','LOGOUT_ALL','ACCOUNT_LOCKED')", nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_idn_refresh_session", x => x.id);
                    table.CheckConstraint("ck_idn_session_revoke", "(revoked_at IS NULL) = (revoke_reason IS NULL)");
                    table.ForeignKey(
                        name: "fk_idn_session_user",
                        column: x => x.user_id,
                        principalTable: "idn_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "idn_user_token",
                columns: table => new
                {
                    id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    user_id = table.Column<byte[]>(type: "binary(16)", nullable: false),
                    purpose = table.Column<string>(type: "enum('VERIFY_EMAIL','RESET_PASSWORD')", nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    token_hash = table.Column<byte[]>(type: "binary(32)", maxLength: 32, nullable: false),
                    expires_at = table.Column<DateTime>(type: "datetime(3)", nullable: false),
                    consumed_at = table.Column<DateTime>(type: "datetime(3)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(3)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(3)")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_idn_user_token", x => x.id);
                    table.ForeignKey(
                        name: "fk_idn_token_user",
                        column: x => x.user_id,
                        principalTable: "idn_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateIndex(
                name: "ix_idn_admin_grant_active",
                table: "idn_admin_grant",
                columns: new[] { "active_marker", "user_id" });

            migrationBuilder.CreateIndex(
                name: "IX_idn_admin_grant_granted_by_user_id",
                table: "idn_admin_grant",
                column: "granted_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_idn_admin_grant_revoked_by_user_id",
                table: "idn_admin_grant",
                column: "revoked_by_user_id");

            migrationBuilder.CreateIndex(
                name: "uk_idn_admin_grant_active",
                table: "idn_admin_grant",
                columns: new[] { "user_id", "active_marker" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uk_idn_ext_provider_subject",
                table: "idn_external_identity",
                columns: new[] { "provider", "provider_subject" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uk_idn_ext_user_provider",
                table: "idn_external_identity",
                columns: new[] { "user_id", "provider" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_idn_session_user_active",
                table: "idn_refresh_session",
                columns: new[] { "user_id", "revoked_at", "expires_at" });

            migrationBuilder.CreateIndex(
                name: "uk_idn_session_token_hash",
                table: "idn_refresh_session",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_idn_user_status_until",
                table: "idn_user",
                columns: new[] { "account_status", "locked_until" });

            migrationBuilder.CreateIndex(
                name: "uk_idn_user_email",
                table: "idn_user",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_idn_token_user_purpose",
                table: "idn_user_token",
                columns: new[] { "user_id", "purpose", "consumed_at", "expires_at" });

            migrationBuilder.CreateIndex(
                name: "uk_idn_token_hash",
                table: "idn_user_token",
                column: "token_hash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "idn_admin_grant");

            migrationBuilder.DropTable(
                name: "idn_external_identity");

            migrationBuilder.DropTable(
                name: "idn_refresh_session");

            migrationBuilder.DropTable(
                name: "idn_user_token");

            migrationBuilder.DropTable(
                name: "idn_user");
        }
    }
}
