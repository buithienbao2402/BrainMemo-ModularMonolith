using BrainMemo.Moderation.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Moderation.Infrastructure.Persistence.Configurations;

public sealed class SanctionConfiguration : IEntityTypeConfiguration<Sanction>
{
    public void Configure(EntityTypeBuilder<Sanction> builder)
    {
        builder.ToTable("mod_sanction");

        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id");

        builder.Property(s => s.ReportId)
            .HasColumnName("report_id");

        builder.Property(s => s.SanctionType)
            .HasColumnName("sanction_type")
            .HasConversion<string>()
            .HasMaxLength(40)
            .IsRequired();

        builder.Property(s => s.TargetType)
            .HasColumnName("target_type")
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(s => s.TargetId)
            .HasColumnName("target_id")
            .IsRequired();

        builder.Property(s => s.SubjectUserId)
            .HasColumnName("subject_user_id")
            .IsRequired();

        builder.Property(s => s.Reason)
            .HasColumnName("reason")
            .HasMaxLength(Sanction.MaxReasonLength)
            .IsRequired();

        builder.Property(s => s.AppliedByUserId)
            .HasColumnName("applied_by_user_id")
            .IsRequired();

        builder.Property(s => s.AppliedAt)
            .HasColumnName("applied_at")
            .IsRequired();

        builder.Property(s => s.ExpiresAt)
            .HasColumnName("expires_at");

        builder.Property(s => s.LiftedAt)
            .HasColumnName("lifted_at");

        builder.Property(s => s.LiftedByUserId)
            .HasColumnName("lifted_by_user_id");

        builder.Property(s => s.LiftReason)
            .HasColumnName("lift_reason")
            .HasMaxLength(Sanction.MaxReasonLength);

        builder.Property(s => s.LiftKind)
            .HasColumnName("lift_kind")
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Ignore(s => s.IsActive);

        builder.HasIndex(s => new { s.TargetType, s.TargetId });
        builder.HasIndex(s => s.ReportId);
        builder.HasIndex(s => s.ExpiresAt);
    }
}
