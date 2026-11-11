using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.BuildingBlocks.Infrastructure.Outbox;

/// <summary>
/// Shared EF Core mapping for <c>crs_outbox_event</c>, <c>lrn_outbox_event</c>, and <c>ast_outbox_event</c>.
/// </summary>
public static class OutboxModelBuilderExtensions
{
    public static ModelBuilder ConfigureOutboxMessage(
        this ModelBuilder modelBuilder,
        string tableName,
        string? publishIndexName = null)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);
        ArgumentException.ThrowIfNullOrWhiteSpace(tableName);

        EntityTypeBuilder<OutboxMessage> entity = modelBuilder.Entity<OutboxMessage>();
        entity.ToTable(tableName);

        entity.HasKey(x => x.Id);

        entity.Property(x => x.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        entity.Property(x => x.EventType)
            .HasColumnName("event_type")
            .HasMaxLength(OutboxMessage.MaxEventTypeLength)
            .IsRequired();

        entity.Property(x => x.AggregateId)
            .HasColumnName("aggregate_id")
            .IsRequired();

        entity.Property(x => x.Payload)
            .HasColumnName("payload")
            .IsRequired();

        entity.Property(x => x.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        entity.Property(x => x.PublishedAt)
            .HasColumnName("published_at");

        entity.Property(x => x.AttemptCount)
            .HasColumnName("attempt_count")
            .HasDefaultValue((ushort)0)
            .IsRequired();

        entity.Property(x => x.LastError)
            .HasColumnName("last_error")
            .HasMaxLength(OutboxMessage.MaxLastErrorLength);

        string resolvedIndexName = !string.IsNullOrWhiteSpace(publishIndexName)
            ? publishIndexName.Trim()
            : $"ix_{tableName.Replace("_event", string.Empty, StringComparison.Ordinal)}_publish";

        entity.HasIndex(x => new { x.PublishedAt, x.CreatedAt })
            .HasDatabaseName(resolvedIndexName);

        return modelBuilder;
    }
}
