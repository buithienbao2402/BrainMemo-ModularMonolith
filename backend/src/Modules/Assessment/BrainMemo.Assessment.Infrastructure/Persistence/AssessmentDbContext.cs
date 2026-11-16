using BrainMemo.Assessment.Domain.Entities;
using BrainMemo.Assessment.Infrastructure.Persistence.Converters;
using BrainMemo.BuildingBlocks.Infrastructure.Outbox;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Assessment.Infrastructure.Persistence;

public class AssessmentDbContext : DbContext
{
    public static readonly MySqlServerVersion DefaultMySqlServerVersion = new(new Version(8, 0, 36));

    public AssessmentDbContext(DbContextOptions<AssessmentDbContext> options)
        : base(options)
    {
    }

    public DbSet<AssessmentComponent> AssessmentComponents => Set<AssessmentComponent>();
    public DbSet<AssessmentConfig> AssessmentConfigs => Set<AssessmentConfig>();
    public DbSet<GradeRecord> GradeRecords => Set<GradeRecord>();

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

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AssessmentDbContext).Assembly);
        modelBuilder.ConfigureOutboxMessage("ast_outbox_event");
    }
}
