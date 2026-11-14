using System.Diagnostics;
using System.Globalization;
using System.Text;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.BuildingBlocks.Infrastructure.Transactions;
using BrainMemo.Identity.Infrastructure.Persistence;
using BrainMemo.SharedKernel.Events;
using BrainMemo.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;
using Xunit;

namespace Identity.IntegrationTests.Fixtures;

[CollectionDefinition(Name)]
public sealed class MySqlCollection : ICollectionFixture<MySqlTestDatabaseFixture>
{
    public const string Name = "MySqlIntegration";
}

/// <summary>
/// Manages an ephemeral MySQL 8.0 Docker container (or uses <c>BRAINMEMO_TEST_MYSQL_CONNECTION</c>) for integration tests.
/// </summary>
public sealed class MySqlTestDatabaseFixture : IAsyncLifetime
{
    private const string RootPassword = "brainmemo_test_root_pw";
    private const string TestImage = "mysql:8.0";

    private string? _containerId;
    private string _adminConnectionString = string.Empty;

    public string AdminConnectionString => _adminConnectionString;

    public async Task InitializeAsync()
    {
        string? externalConnection = Environment.GetEnvironmentVariable("BRAINMEMO_TEST_MYSQL_CONNECTION");
        if (!string.IsNullOrWhiteSpace(externalConnection))
        {
            _adminConnectionString = externalConnection.Trim();
            await WaitForMySqlReadyAsync(_adminConnectionString).ConfigureAwait(false);
            return;
        }

        string containerName = $"brainmemo-idn-test-{Guid.NewGuid():N}"[..32];
        string runArgs =
            $"run -d --rm --name {containerName} -p 127.0.0.1:0:3306 "
            + $"-e MYSQL_ROOT_PASSWORD={RootPassword} -e TZ=UTC "
            + $"{TestImage} --character-set-server=utf8mb4 --collation-server=utf8mb4_0900_ai_ci --default-time-zone=+00:00";

        (int exitCode, string stdout, string stderr) = await RunDockerCommandAsync(runArgs).ConfigureAwait(false);
        if (exitCode != 0 || string.IsNullOrWhiteSpace(stdout))
        {
            throw new InvalidOperationException(
                $"Failed to start MySQL 8 test container (Docker exit {exitCode}): {stderr}");
        }

        _containerId = stdout.Trim();

        (_, string portOutput, string portError) = await RunDockerCommandAsync($"port {_containerId} 3306/tcp")
            .ConfigureAwait(false);

        int hostPort = ParseMappedPort(portOutput, portError);
        _adminConnectionString =
            $"Server=127.0.0.1;Port={hostPort.ToString(CultureInfo.InvariantCulture)};User ID=root;Password={RootPassword};SslMode=None;AllowPublicKeyRetrieval=True;AllowUserVariables=True;";

        await WaitForMySqlReadyAsync(_adminConnectionString).ConfigureAwait(false);
    }

    public async Task DisposeAsync()
    {
        if (!string.IsNullOrWhiteSpace(_containerId))
        {
            await RunDockerCommandAsync($"rm -f {_containerId}").ConfigureAwait(false);
            _containerId = null;
        }
    }

    public async Task<string> CreateDatabaseAsync(string databaseName)
    {
        await using MySqlConnection conn = new(_adminConnectionString);
        await conn.OpenAsync().ConfigureAwait(false);
        await using MySqlCommand cmd = conn.CreateCommand();
        cmd.CommandText = $"CREATE DATABASE `{databaseName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;";
        await cmd.ExecuteNonQueryAsync().ConfigureAwait(false);

        MySqlConnectionStringBuilder builder = new(_adminConnectionString)
        {
            Database = databaseName,
        };
        return builder.ConnectionString;
    }

    public async Task DropDatabaseAsync(string databaseName)
    {
        // Safety guard: never drop the shared development database
        if (string.Equals(databaseName, "brainmemo_lms", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        await using MySqlConnection conn = new(_adminConnectionString);
        await conn.OpenAsync().ConfigureAwait(false);
        await using MySqlCommand cmd = conn.CreateCommand();
        cmd.CommandText = $"DROP DATABASE IF EXISTS `{databaseName}`;";
        await cmd.ExecuteNonQueryAsync().ConfigureAwait(false);
    }

    public static IdentityDbContext CreateDbContext(string connectionString)
    {
        DbContextOptions<IdentityDbContext> options = new DbContextOptionsBuilder<IdentityDbContext>()
            .UseMySql(connectionString, IdentityDbContext.DefaultMySqlServerVersion)
            .Options;

        return new IdentityDbContext(options);
    }

    public static string FindRepositoryRoot()
    {
        DirectoryInfo? dir = new(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "db", "schema.sql")))
            {
                return dir.FullName;
            }

            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException("Could not locate repository root containing db/schema.sql.");
    }

    public async Task ExecuteSqlFileAsync(string sqlFilePath, string? targetDatabase = null)
    {
        string connectionString = string.IsNullOrWhiteSpace(targetDatabase)
            ? _adminConnectionString
            : new MySqlConnectionStringBuilder(_adminConnectionString) { Database = targetDatabase }.ConnectionString;

        string sql = await File.ReadAllTextAsync(sqlFilePath, Encoding.UTF8).ConfigureAwait(false);

        await using MySqlConnection conn = new(connectionString);
        await conn.OpenAsync().ConfigureAwait(false);
        await using MySqlCommand cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.CommandTimeout = 120;
        await cmd.ExecuteNonQueryAsync().ConfigureAwait(false);
    }

    private static async Task WaitForMySqlReadyAsync(string connectionString)
    {
        Exception? lastException = null;
        DateTime deadline = DateTime.UtcNow.AddSeconds(60);

        while (DateTime.UtcNow < deadline)
        {
            try
            {
                await using MySqlConnection conn = new(connectionString);
                await conn.OpenAsync().ConfigureAwait(false);
                await using MySqlCommand cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT 1;";
                _ = await cmd.ExecuteScalarAsync().ConfigureAwait(false);
                return;
            }
            catch (Exception ex) when (ex is MySqlException or TimeoutException)
            {
                lastException = ex;
                await Task.Delay(750).ConfigureAwait(false);
            }
        }

        throw new TimeoutException($"Timed out waiting for MySQL 8 container readiness: {lastException?.Message}", lastException);
    }

    private static int ParseMappedPort(string portOutput, string portError)
    {
        foreach (string line in portOutput.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries))
        {
            int colonIndex = line.LastIndexOf(':');
            if (colonIndex >= 0 && int.TryParse(line[(colonIndex + 1)..].Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out int port))
            {
                return port;
            }
        }

        throw new InvalidOperationException($"Could not parse MySQL mapped port from '{portOutput}' (stderr: '{portError}').");
    }

    private static async Task<(int ExitCode, string Stdout, string Stderr)> RunDockerCommandAsync(string arguments)
    {
        using Process process = new()
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "docker",
                Arguments = arguments,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            },
        };

        process.Start();
        Task<string> stdoutTask = process.StandardOutput.ReadToEndAsync();
        Task<string> stderrTask = process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync().ConfigureAwait(false);

        return (process.ExitCode, await stdoutTask.ConfigureAwait(false), await stderrTask.ConfigureAwait(false));
    }
}

internal sealed class MutableTestClock(DateTimeOffset initialUtc) : IClock
{
    public DateTimeOffset UtcNow { get; set; } = initialUtc;
}

internal sealed class TestEventCollector : IEventBus
{
    public List<IntegrationEvent> PublishedEvents { get; } = [];

    public Task Publish(IntegrationEvent @event, CancellationToken ct = default)
    {
        PublishedEvents.Add(@event);
        return Task.CompletedTask;
    }
}
