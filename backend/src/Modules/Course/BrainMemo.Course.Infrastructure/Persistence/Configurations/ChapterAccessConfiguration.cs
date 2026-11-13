using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Course.Infrastructure.Persistence.Configurations;

public sealed class ChapterAccessConfiguration : IEntityTypeConfiguration<ChapterAccess>
{
    public void Configure(EntityTypeBuilder<ChapterAccess> builder)
    {
        builder.ToTable("crs_chapter_access");

        builder.HasKey(a => a.ChapterId);
        builder.Property(a => a.ChapterId)
            .HasColumnName("chapter_id")
            .ValueGeneratedNever();

        builder.Property(a => a.CourseId)
            .HasColumnName("course_id")
            .IsRequired();

        builder.Property(a => a.AccessMode)
            .HasColumnName("access_mode")
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(a => a.PasscodeHash)
            .HasColumnName("passcode_hash")
            .HasMaxLength(100);

        builder.Property(a => a.PasscodeVersion)
            .HasColumnName("passcode_version")
            .IsRequired();

        builder.Property(a => a.UpdatedAt)
            .HasColumnName("updated_at")
            .HasPrecision(3)
            .IsRequired();

        builder.HasIndex(a => a.CourseId)
            .HasDatabaseName("ix_crs_chapter_access_course");
    }
}
