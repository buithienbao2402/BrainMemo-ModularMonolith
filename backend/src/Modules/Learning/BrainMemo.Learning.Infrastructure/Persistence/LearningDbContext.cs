using BrainMemo.BuildingBlocks.Infrastructure.Outbox;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.Learning.Infrastructure.Persistence.Converters;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Learning.Infrastructure.Persistence;

public class LearningDbContext : DbContext
{
    public static readonly MySqlServerVersion DefaultMySqlServerVersion = new(new Version(8, 0, 36));

    public LearningDbContext(DbContextOptions<LearningDbContext> options)
        : base(options)
    {
    }

    public DbSet<BlockCompletion> BlockCompletions => Set<BlockCompletion>();
    public DbSet<CourseCompletion> CourseCompletions => Set<CourseCompletion>();
    public DbSet<Bookmark> Bookmarks => Set<Bookmark>();
    public DbSet<Comment> Comments => Set<Comment>();

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

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(LearningDbContext).Assembly);
        modelBuilder.ConfigureOutboxMessage("lrn_outbox_event");
    }
}
