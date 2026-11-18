using BrainMemo.Moderation.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Moderation.Infrastructure.Persistence.Configurations;

public sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("mod_audit_log");

        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasColumnName("id");

        builder.Property(a => a.OccurredAt)
            .HasColumnName("occurred_at")
            .IsRequired();

        builder.Property(a => a.ActorType)
            .HasColumnName("actor_type")
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(a => a.ActorUserId)
            .HasColumnName("actor_user_id");

        builder.Property(a => a.Action)
            .HasColumnName("action")
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(a => a.ObjectType)
            .HasColumnName("object_type")
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(a => a.ObjectId)
            .HasColumnName("object_id")
            .IsRequired();

        builder.Property(a => a.ObjectLabel)
            .HasColumnName("object_label")
            .HasMaxLength(AuditLog.MaxLabelLength);

        builder.Property(a => a.Reason)
            .HasColumnName("reason")
            .HasMaxLength(AuditLog.MaxReasonLength)
            .IsRequired();

        builder.Property(a => a.Details)
            .HasColumnName("details")
            .HasColumnType("json");

        builder.Property(a => a.ReportId)
            .HasColumnName("report_id");

        builder.Property(a => a.SanctionId)
            .HasColumnName("sanction_id");

        builder.HasIndex(a => a.OccurredAt);
        builder.HasIndex(a => new { a.ActorUserId, a.OccurredAt });
        builder.HasIndex(a => new { a.ObjectType, a.ObjectId, a.OccurredAt });
        builder.HasIndex(a => new { a.Action, a.OccurredAt });
    }
}
