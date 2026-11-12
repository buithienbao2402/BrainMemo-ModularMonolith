using BrainMemo.Identity.Contracts;
using BrainMemo.Identity.Infrastructure.Contracts;
using BrainMemo.Identity.Infrastructure.Persistence;
using BrainMemo.SharedKernel.Results;
using Identity.IntegrationTests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using MySqlConnector;
using Xunit;

namespace Identity.IntegrationTests.Persistence;

[Collection(MySqlCollection.Name)]
public sealed class IdentitySchemaAndMigrationTests(MySqlTestDatabaseFixture fixture)
{
    [Fact]
    public async Task EfCoreMigration_CreatesExactFiveIdentityTablesWithCheckAndUniqueConstraints()
    {
        string dbName = $"idn_mig_{Guid.NewGuid():N}"[..24];
        string connectionString = await fixture.CreateDatabaseAsync(dbName);

        try
        {
            await using IdentityDbContext db = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
            await db.Database.MigrateAsync();

            await using MySqlConnection conn = new(connectionString);
            await conn.OpenAsync();

            // 1. Verify all 5 idn_* tables were created.
            await using (MySqlCommand tablesCmd = conn.CreateCommand())
            {
                tablesCmd.CommandText =
                    "SELECT TABLE_NAME FROM information_schema.TABLES "
                    + "WHERE TABLE_SCHEMA = @schema AND TABLE_NAME LIKE 'idn_%' ORDER BY TABLE_NAME;";
                tablesCmd.Parameters.AddWithValue("@schema", dbName);

                List<string> tables = [];
                await using MySqlDataReader reader = await tablesCmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    tables.Add(reader.GetString(0));
                }

                Assert.Equal(
                    ["idn_admin_grant", "idn_external_identity", "idn_refresh_session", "idn_user", "idn_user_token"],
                    tables);
            }

            // 2. Verify MySQL CHECK constraint ck_idn_user_lock rejects invalid ACTIVE + lock_reason row.
            await using MySqlCommand badInsertCmd = conn.CreateCommand();
            badInsertCmd.CommandText =
                "INSERT INTO idn_user (id, email, account_status, lock_reason) "
                + "VALUES (UUID_TO_BIN('01960000-0000-7000-8000-000000000099'), 'badlock@test.local', 'ACTIVE', 'Should fail');";

            MySqlException checkEx = await Assert.ThrowsAsync<MySqlException>(() => badInsertCmd.ExecuteNonQueryAsync());
            Assert.Equal(3819, checkEx.Number); // ER_CHECK_CONSTRAINT_VIOLATED

            // 3. Verify generated VIRTUAL active_marker allows multiple revoked grants but blocks duplicate active grants.
            await using MySqlCommand validUserCmd = conn.CreateCommand();
            validUserCmd.CommandText =
                "INSERT INTO idn_user (id, email) VALUES (UUID_TO_BIN('01960000-0000-7000-8000-000000000100'), 'admincheck@test.local');"
                + "INSERT INTO idn_admin_grant (id, user_id, revoked_at) VALUES (UUID_TO_BIN('01960000-0000-7000-8000-000000000101'), UUID_TO_BIN('01960000-0000-7000-8000-000000000100'), UTC_TIMESTAMP(3));"
                + "INSERT INTO idn_admin_grant (id, user_id, revoked_at) VALUES (UUID_TO_BIN('01960000-0000-7000-8000-000000000102'), UUID_TO_BIN('01960000-0000-7000-8000-000000000100'), UTC_TIMESTAMP(3));"
                + "INSERT INTO idn_admin_grant (id, user_id, revoked_at) VALUES (UUID_TO_BIN('01960000-0000-7000-8000-000000000103'), UUID_TO_BIN('01960000-0000-7000-8000-000000000100'), NULL);";
            await validUserCmd.ExecuteNonQueryAsync();

            await using MySqlCommand duplicateActiveGrantCmd = conn.CreateCommand();
            duplicateActiveGrantCmd.CommandText =
                "INSERT INTO idn_admin_grant (id, user_id, revoked_at) VALUES (UUID_TO_BIN('01960000-0000-7000-8000-000000000104'), UUID_TO_BIN('01960000-0000-7000-8000-000000000100'), NULL);";

            MySqlException dupEx = await Assert.ThrowsAsync<MySqlException>(() => duplicateActiveGrantCmd.ExecuteNonQueryAsync());
            Assert.Equal(1062, dupEx.Number); // ER_DUP_ENTRY on uk_idn_admin_grant_active
        }
        finally
        {
            await fixture.DropDatabaseAsync(dbName);
        }
    }

    [Fact]
    public async Task BaselineSchemaSqlAndSeedAdminScript_RoundTripAccuratelyThroughIdentityContract()
    {
        string repoRoot = MySqlTestDatabaseFixture.FindRepositoryRoot();
        string schemaSqlPath = Path.Combine(repoRoot, "db", "schema.sql");
        string seedSqlPath = Path.Combine(repoRoot, "db", "seed", "01_seed_admin.sql");

        try
        {
            await fixture.ExecuteSqlFileAsync(schemaSqlPath);
            await fixture.ExecuteSqlFileAsync(seedSqlPath);

            string connectionString = new MySqlConnectionStringBuilder(fixture.AdminConnectionString)
            {
                Database = "brainmemo_lms",
            }.ConnectionString;

            await using IdentityDbContext db = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
            IdentityContractService contract = new(
                db,
                new MutableTestClock(DateTimeOffset.UtcNow),
                new TestEventCollector(),
                NullLogger<IdentityContractService>.Instance);

            Guid expectedSeedAdminId = Guid.Parse("01a1cb77-0375-7fb7-8b76-ecaf4cc36db6");

            Result<Guid?> foundByEmail = await contract.FindUserIdByEmail("  ADMIN@BRAINMEMO.LOCAL ");
            Assert.True(foundByEmail.IsSuccess);
            Assert.Equal(expectedSeedAdminId, foundByEmail.Value);

            Result<bool> isAdmin = await contract.IsAdmin(expectedSeedAdminId);
            Assert.True(isAdmin.IsSuccess);
            Assert.True(isAdmin.Value);

            Result<bool> isLastAdmin = await contract.IsLastAdmin(expectedSeedAdminId);
            Assert.True(isLastAdmin.IsSuccess);
            Assert.True(isLastAdmin.Value);

            Result<AccountStatusDto> status = await contract.GetAccountStatus(expectedSeedAdminId);
            Assert.True(status.IsSuccess);
            Assert.Equal(AccountStatuses.Active, status.Value.Status);
            Assert.True(status.Value.EmailVerified);
            Assert.Null(status.Value.LockedUntil);
            Assert.Null(status.Value.LockReason);
        }
        finally
        {
            await fixture.DropDatabaseAsync("brainmemo_lms");
        }
    }
}

