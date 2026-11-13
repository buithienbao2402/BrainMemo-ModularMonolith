using BrainMemo.Course.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Course.Infrastructure.Persistence.Configurations;

public sealed class ChapterUnlockConfiguration : IEntityTypeConfiguration<ChapterUnlock>
{
    public void Configure(EntityTypeBuilder<ChapterUnlock> builder)
    {
        builder.ToTable("crs_chapter_unlock");

        builder.HasKey(u => new { u.ChapterId, u.UserId });

        builder.Property(u => u.ChapterId)
            .HasColumnName("chapter_id")
            .ValueGeneratedNever();

        builder.Property(u => u.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(u => u.PasscodeVersion)
            .HasColumnName("passcode_version")
            .IsRequired();

        builder.Property(u => u.UnlockedAt)
            .HasColumnName("unlocked_at")
            .HasPrecision(3)
            .IsRequired();

        builder.HasIndex(u => u.UserId)
            .HasDatabaseName("ix_crs_chapter_unlock_user");
    }
}
