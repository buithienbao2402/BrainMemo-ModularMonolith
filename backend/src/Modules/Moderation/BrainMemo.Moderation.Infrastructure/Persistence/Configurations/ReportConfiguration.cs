using BrainMemo.Moderation.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Moderation.Infrastructure.Persistence.Configurations;

public sealed class ReportConfiguration : IEntityTypeConfiguration<Report>
{
    public void Configure(EntityTypeBuilder<Report> builder)
    {
        builder.ToTable("mod_report");

        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasColumnName("id");

        builder.Property(r => r.Source)
            .HasColumnName("source")
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(r => r.ReporterUserId)
            .HasColumnName("reporter_user_id");

        builder.Property(r => r.TargetType)
            .HasColumnName("target_type")
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(r => r.TargetId)
            .HasColumnName("target_id")
            .IsRequired();

        builder.Property(r => r.TargetCourseId)
            .HasColumnName("target_course_id")
            .IsRequired();

        builder.Property(r => r.TargetOwnerUserId)
            .HasColumnName("target_owner_user_id")
            .IsRequired();

        builder.Property(r => r.AiFindingId)
            .HasColumnName("ai_finding_id");

        builder.Property(r => r.ReasonCode)
            .HasColumnName("reason_code")
            .HasMaxLength(Report.MaxReasonCodeLength)
            .IsRequired();

        builder.Property(r => r.Description)
            .HasColumnName("description");

        builder.Property(r => r.TargetSnapshot)
            .HasColumnName("target_snapshot");

        builder.Property(r => r.AiScore)
            .HasColumnName("ai_score")
            .HasPrecision(5, 4);

        builder.Property(r => r.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(r => r.ResolutionReason)
            .HasColumnName("resolution_reason")
            .HasMaxLength(Report.MaxResolutionReasonLength);

        builder.Property(r => r.ResolvedByUserId)
            .HasColumnName("resolved_by_user_id");

        builder.Property(r => r.ResolvedAt)
            .HasColumnName("resolved_at");

        builder.Property(r => r.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.HasMany(r => r.Evidences)
            .WithOne()
            .HasForeignKey(e => e.ReportId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => r.AiFindingId)
            .IsUnique();

        builder.HasIndex(r => new { r.Status, r.Source, r.TargetType, r.CreatedAt });
        builder.HasIndex(r => new { r.TargetType, r.TargetId });
        builder.HasIndex(r => r.TargetCourseId);
    }
}
