using BrainMemo.Profile.Domain.Entities;
using BrainMemo.Profile.Infrastructure.Persistence.Converters;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Profile.Infrastructure.Persistence;

/// <summary>
/// EF Core database context exclusively owning the <c>prf_*</c> Profile tables.
/// </summary>
public sealed class ProfileDbContext(DbContextOptions<ProfileDbContext> options)
    : DbContext(options)
{
    public static readonly MySqlServerVersion DefaultMySqlServerVersion = new(new Version(8, 0, 36));

    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        ArgumentNullException.ThrowIfNull(configurationBuilder);
        base.ConfigureConventions(configurationBuilder);

        configurationBuilder.Properties<Guid>()
            .HaveColumnType("binary(16)")
            .HaveConversion<BigEndianGuidBytesConverter>();

        configurationBuilder.Properties<Guid?>()
            .HaveColumnType("binary(16)")
            .HaveConversion<NullableBigEndianGuidBytesConverter>();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        modelBuilder
            .HasCharSet("utf8mb4")
            .UseCollation("utf8mb4_0900_ai_ci");

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ProfileDbContext).Assembly);

        base.OnModelCreating(modelBuilder);
    }
}
