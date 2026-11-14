using BrainMemo.Content.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Content.Infrastructure.Persistence.Configurations;

public class ChapterVersionConfiguration : IEntityTypeConfiguration<ChapterVersion>
{
    public void Configure(EntityTypeBuilder<ChapterVersion> builder)
    {
        builder.ToTable("cnt_chapter_version");

        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).HasColumnName("id");
        builder.Property(v => v.ChapterId).HasColumnName("chapter_id").IsRequired();
        builder.Property(v => v.VersionNo).HasColumnName("version_no").IsRequired();
        builder.Property(v => v.Snapshot).HasColumnName("snapshot").HasColumnType("json").IsRequired();
        builder.Property(v => v.RestoredFromVersionNo).HasColumnName("restored_from_version_no");
        builder.Property(v => v.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(v => v.PublishedAt).HasColumnName("published_at");

        builder.HasIndex(v => new { v.ChapterId, v.VersionNo })
            .IsUnique()
            .HasDatabaseName("uk_cnt_chapter_version");
        builder.HasIndex(v => new { v.ChapterId, v.PublishedAt })
            .HasDatabaseName("ix_cnt_chapter_version_published");

        builder.HasOne<Chapter>()
            .WithMany()
            .HasForeignKey(v => v.ChapterId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
