using BrainMemo.Notification.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Notification.Infrastructure.Persistence.Configurations;

public sealed class NotificationItemConfiguration : IEntityTypeConfiguration<NotificationItem>
{
    public void Configure(EntityTypeBuilder<NotificationItem> builder)
    {
        builder.ToTable("ntf_notification");

        builder.HasKey(n => n.Id);

        builder.Property(n => n.Id)
            .HasColumnName("id")
            .HasColumnType("binary(16)")
            .ValueGeneratedNever();

        builder.Property(n => n.RecipientUserId)
            .HasColumnName("recipient_user_id")
            .HasColumnType("binary(16)")
            .IsRequired();

        builder.Property(n => n.Type)
            .HasColumnName("type")
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(n => n.PayloadJson)
            .HasColumnName("payload")
            .HasColumnType("json")
            .IsRequired();

        builder.Property(n => n.SourceEventId)
            .HasColumnName("source_event_id")
            .HasColumnType("binary(16)")
            .IsRequired();

        builder.Property(n => n.AnnouncementId)
            .HasColumnName("announcement_id")
            .HasColumnType("binary(16)")
            .IsRequired(false);

        builder.Property(n => n.ReadAt)
            .HasColumnName("read_at")
            .HasPrecision(3)
            .IsRequired(false);

        builder.Property(n => n.DeletedAt)
            .HasColumnName("deleted_at")
            .HasPrecision(3)
            .IsRequired(false);

        builder.Property(n => n.CreatedAt)
            .HasColumnName("created_at")
            .HasPrecision(3)
            .IsRequired();

        builder.HasIndex(n => new { n.SourceEventId, n.RecipientUserId }, "uk_ntf_notification_event_recipient")
            .IsUnique();

        builder.HasIndex(n => new { n.RecipientUserId, n.DeletedAt, n.CreatedAt }, "ix_ntf_notification_inbox");

        builder.HasIndex(n => new { n.RecipientUserId, n.ReadAt, n.DeletedAt }, "ix_ntf_notification_unread");

        builder.HasOne(n => n.Announcement)
            .WithMany()
            .HasForeignKey(n => n.AnnouncementId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
