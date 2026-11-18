using BrainMemo.Learning.Domain.Entities;
using BrainMemo.Learning.Domain.Enums;
using BrainMemo.Learning.Infrastructure.Persistence.Converters;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Learning.Infrastructure.Persistence.Configurations;

public sealed class BlockCompletionConfiguration : IEntityTypeConfiguration<BlockCompletion>
{
    public void Configure(EntityTypeBuilder<BlockCompletion> builder)
    {
        builder.ToTable("lrn_block_completion");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");

        builder.Property(c => c.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(c => c.CourseId)
            .HasColumnName("course_id")
            .IsRequired();

        builder.Property(c => c.ChapterId)
            .HasColumnName("chapter_id")
            .IsRequired();

        builder.Property(c => c.BlockId)
            .HasColumnName("block_id")
            .IsRequired();

        builder.Property(c => c.BlockType)
            .HasColumnName("block_type")
            .HasConversion<LearningBlockTypeValueConverter>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(c => c.CompletedAt)
            .HasColumnName("completed_at")
            .HasPrecision(3)
            .IsRequired();

        builder.HasIndex(c => new { c.UserId, c.BlockId })
            .IsUnique()
            .HasDatabaseName("uk_lrn_block_completion_user_block");

        builder.HasIndex(c => new { c.UserId, c.CourseId, c.CompletedAt })
            .HasDatabaseName("ix_lrn_block_completion_user_course");

        builder.HasIndex(c => new { c.CourseId, c.UserId })
            .HasDatabaseName("ix_lrn_block_completion_course_user");
    }
}
