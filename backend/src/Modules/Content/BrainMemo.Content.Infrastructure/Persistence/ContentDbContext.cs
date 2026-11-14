using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Infrastructure.Persistence.Converters;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Content.Infrastructure.Persistence;

public class ContentDbContext : DbContext
{
    public static readonly MySqlServerVersion DefaultMySqlServerVersion = new(new Version(8, 0, 36));

    public ContentDbContext(DbContextOptions<ContentDbContext> options)
        : base(options)
    {
    }

    public DbSet<Chapter> Chapters => Set<Chapter>();
    public DbSet<ChapterVersion> ChapterVersions => Set<ChapterVersion>();
    public DbSet<Resource> Resources => Set<Resource>();
    public DbSet<QuestionBank> QuestionBanks => Set<QuestionBank>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<QuestionOption> QuestionOptions => Set<QuestionOption>();
    public DbSet<QuestionTag> QuestionTags => Set<QuestionTag>();
    public DbSet<Block> Blocks => Set<Block>();
    public DbSet<PublishedBlock> PublishedBlocks => Set<PublishedBlock>();
    public DbSet<QuizConfig> QuizConfigs => Set<QuizConfig>();
    public DbSet<QuizQuestion> QuizQuestions => Set<QuizQuestion>();
    public DbSet<QuizRandomRule> QuizRandomRules => Set<QuizRandomRule>();
    public DbSet<QuizPrerequisite> QuizPrerequisites => Set<QuizPrerequisite>();
    public DbSet<QuizException> QuizExceptions => Set<QuizException>();
    public DbSet<AssignmentConfig> AssignmentConfigs => Set<AssignmentConfig>();

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

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ContentDbContext).Assembly);
    }
}
