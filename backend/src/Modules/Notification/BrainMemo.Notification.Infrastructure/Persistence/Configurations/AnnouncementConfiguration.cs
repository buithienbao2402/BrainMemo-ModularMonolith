using BrainMemo.Notification.Domain.Entities;
using BrainMemo.Notification.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Notification.Infrastructure.Persistence.Configurations;

public sealed class AnnouncementConfiguration : IEntityTypeConfiguration<Announcement>
{
    public void Configure(EntityTypeBuilder<Announcement> builder)
    {
        builder.ToTable("ntf_announcement");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Id)
            .HasColumnName("id")
            .HasColumnType("binary(16)")
            .ValueGeneratedNever();

        builder.Property(a => a.Title)
            .HasColumnName("title")
            .HasMaxLength(Announcement.MaxTitleLength)
            .IsRequired();

        builder.Property(a => a.Body)
            .HasColumnName("body")
            .HasColumnType("text")
            .IsRequired();

        builder.Property(a => a.CreatedByUserId)
            .HasColumnName("created_by_user_id")
            .HasColumnType("binary(16)")
            .IsRequired();

        builder.Property(a => a.DispatchStatus)
            .HasColumnName("dispatch_status")
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasDefaultValue(DispatchStatus.Pending)
            .IsRequired();

        builder.Property(a => a.RecipientCount)
            .HasColumnName("recipient_count")
            .IsRequired(false);

        builder.Property(a => a.CreatedAt)
            .HasColumnName("created_at")
            .HasPrecision(3)
            .IsRequired();

        builder.Property(a => a.DispatchedAt)
            .HasColumnName("dispatched_at")
            .HasPrecision(3)
            .IsRequired(false);

        builder.HasIndex(a => new { a.DispatchStatus, a.CreatedAt }, "ix_ntf_announcement_dispatch");
    }
}
