using BrainMemo.Moderation.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Moderation.Infrastructure.Persistence.Configurations;

public sealed class ReportEvidenceConfiguration : IEntityTypeConfiguration<ReportEvidence>
{
    public void Configure(EntityTypeBuilder<ReportEvidence> builder)
    {
        builder.ToTable("mod_report_evidence");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");

        builder.Property(e => e.ReportId)
            .HasColumnName("report_id")
            .IsRequired();

        builder.Property(e => e.Kind)
            .HasColumnName("kind")
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(e => e.StorageKey)
            .HasColumnName("storage_key")
            .HasMaxLength(500);

        builder.Property(e => e.Url)
            .HasColumnName("url")
            .HasMaxLength(2048);

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.HasIndex(e => e.ReportId);
    }
}
