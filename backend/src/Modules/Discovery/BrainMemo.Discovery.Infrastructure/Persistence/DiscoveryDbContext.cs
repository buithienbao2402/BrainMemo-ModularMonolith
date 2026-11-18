using BrainMemo.Discovery.Domain.Entities;
using BrainMemo.Discovery.Infrastructure.Persistence.Converters;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Discovery.Infrastructure.Persistence;

public class DiscoveryDbContext : DbContext
{
    public static readonly MySqlServerVersion DefaultMySqlServerVersion = new(new Version(8, 0, 36));

    public DiscoveryDbContext(DbContextOptions<DiscoveryDbContext> options)
        : base(options)
    {
    }

    public DbSet<CourseEntry> CourseEntries => Set<CourseEntry>();
    public DbSet<CourseActivityFact> CourseActivityFacts => Set<CourseActivityFact>();
    public DbSet<SearchHistory> SearchHistories => Set<SearchHistory>();

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
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(DiscoveryDbContext).Assembly);
    }
}
