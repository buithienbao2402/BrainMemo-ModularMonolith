using BrainMemo.Messaging.Domain.Entities;
using BrainMemo.Messaging.Infrastructure.Persistence.Converters;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Messaging.Infrastructure.Persistence;

public sealed class MessagingDbContext(DbContextOptions<MessagingDbContext> options) : DbContext(options)
{
    public static readonly MySqlServerVersion DefaultMySqlServerVersion = new(new Version(8, 0, 36));

    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();

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

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(MessagingDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
