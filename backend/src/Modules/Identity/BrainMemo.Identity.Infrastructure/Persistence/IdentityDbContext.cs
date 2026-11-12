using BrainMemo.Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Identity.Infrastructure.Persistence;

/// <summary>
/// EF Core database context exclusively owning the five <c>idn_*</c> Identity tables.
/// </summary>
public sealed class IdentityDbContext(DbContextOptions<IdentityDbContext> options)
    : DbContext(options)
{
    public static readonly MySqlServerVersion DefaultMySqlServerVersion = new(new Version(8, 0, 36));

    public DbSet<User> Users => Set<User>();

    public DbSet<ExternalIdentity> ExternalIdentities => Set<ExternalIdentity>();

    public DbSet<RefreshSession> RefreshSessions => Set<RefreshSession>();

    public DbSet<UserToken> UserTokens => Set<UserToken>();

    public DbSet<AdminGrant> AdminGrants => Set<AdminGrant>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        modelBuilder
            .HasCharSet("utf8mb4")
            .UseCollation("utf8mb4_0900_ai_ci");

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(IdentityDbContext).Assembly);

        base.OnModelCreating(modelBuilder);
    }
}

