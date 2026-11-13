using BrainMemo.Notification.Domain.Entities;
using BrainMemo.Notification.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Notification.Infrastructure.Persistence.Configurations;

public sealed class EmailDeliveryConfiguration : IEntityTypeConfiguration<EmailDelivery>
{
    public void Configure(EntityTypeBuilder<EmailDelivery> builder)
    {
        builder.ToTable("ntf_email_delivery");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id)
            .HasColumnName("id")
            .HasColumnType("binary(16)")
            .ValueGeneratedNever();

        builder.Property(e => e.SourceEventId)
            .HasColumnName("source_event_id")
            .HasColumnType("binary(16)")
            .IsRequired();

        builder.Property(e => e.Template)
            .HasColumnName("template")
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(e => e.RecipientUserId)
            .HasColumnName("recipient_user_id")
            .HasColumnType("binary(16)")
            .IsRequired();

        builder.Property(e => e.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasDefaultValue(EmailDeliveryStatus.Pending)
            .IsRequired();

        builder.Property(e => e.AttemptCount)
            .HasColumnName("attempt_count")
            .HasColumnType("tinyint")
            .HasDefaultValue((byte)0)
            .IsRequired();

        builder.Property(e => e.NextAttemptAt)
            .HasColumnName("next_attempt_at")
            .HasPrecision(3)
            .IsRequired(false);

        builder.Property(e => e.LastAttemptAt)
            .HasColumnName("last_attempt_at")
            .HasPrecision(3)
            .IsRequired(false);

        builder.Property(e => e.LastError)
            .HasColumnName("last_error")
            .HasMaxLength(EmailDelivery.MaxLastErrorLength)
            .IsRequired(false);

        builder.Property(e => e.SentAt)
            .HasColumnName("sent_at")
            .HasPrecision(3)
            .IsRequired(false);

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at")
            .HasPrecision(3)
            .IsRequired();

        builder.HasIndex(e => new { e.SourceEventId, e.Template }, "uk_ntf_email_event_template")
            .IsUnique();

        builder.HasIndex(e => new { e.Status, e.NextAttemptAt }, "ix_ntf_email_retry");
    }
}
