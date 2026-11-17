using BrainMemo.Learning.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Learning.Infrastructure.Persistence.Configurations;

public sealed class CommentConfiguration : IEntityTypeConfiguration<Comment>
{
    public void Configure(EntityTypeBuilder<Comment> builder)
    {
        builder.ToTable("lrn_comment");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id)
            .HasColumnName("id")
            .HasColumnType("binary(16)")
            .ValueGeneratedNever();

        builder.Property(c => c.CourseId)
            .HasColumnName("course_id")
            .HasColumnType("binary(16)")
            .IsRequired();

        builder.Property(c => c.ChapterId)
            .HasColumnName("chapter_id")
            .HasColumnType("binary(16)")
            .IsRequired(false);

        builder.Property(c => c.BlockId)
            .HasColumnName("block_id")
            .HasColumnType("binary(16)")
            .IsRequired(false);

        builder.Property(c => c.UserId)
            .HasColumnName("user_id")
            .HasColumnType("binary(16)")
            .IsRequired();

        builder.Property(c => c.ParentCommentId)
            .HasColumnName("parent_comment_id")
            .HasColumnType("binary(16)")
            .IsRequired(false);

        builder.Property(c => c.Title)
            .HasColumnName("title")
            .HasMaxLength(255)
            .IsRequired(false);

        builder.Property(c => c.Content)
            .HasColumnName("content")
            .HasColumnType("text")
            .IsRequired();

        builder.Property(c => c.IsResolved)
            .HasColumnName("is_resolved")
            .HasColumnType("tinyint(1)")
            .HasDefaultValue(false)
            .IsRequired();

        builder.Property(c => c.ResolvedAt)
            .HasColumnName("resolved_at")
            .HasPrecision(3)
            .IsRequired(false);

        builder.Property(c => c.ResolvedByUserId)
            .HasColumnName("resolved_by_user_id")
            .HasColumnType("binary(16)")
            .IsRequired(false);

        builder.Property(c => c.ResolvedCommentId)
            .HasColumnName("resolved_comment_id")
            .HasColumnType("binary(16)")
            .IsRequired(false);

        builder.Property(c => c.IsPinned)
            .HasColumnName("is_pinned")
            .HasColumnType("tinyint(1)")
            .HasDefaultValue(false)
            .IsRequired();

        builder.Property(c => c.PinnedAt)
            .HasColumnName("pinned_at")
            .HasPrecision(3)
            .IsRequired(false);

        builder.Property(c => c.PinnedByUserId)
            .HasColumnName("pinned_by_user_id")
            .HasColumnType("binary(16)")
            .IsRequired(false);

        builder.Property(c => c.EditedAt)
            .HasColumnName("edited_at")
            .HasPrecision(3)
            .IsRequired(false);

        builder.Property(c => c.DeletedAt)
            .HasColumnName("deleted_at")
            .HasPrecision(3)
            .IsRequired(false);

        builder.Property(c => c.CreatedAt)
            .HasColumnName("created_at")
            .HasPrecision(3)
            .IsRequired();

        builder.Property(c => c.UpdatedAt)
            .HasColumnName("updated_at")
            .HasPrecision(3)
            .IsRequired();

        builder.HasIndex(c => new { c.CourseId, c.ChapterId, c.DeletedAt, c.CreatedAt })
            .HasDatabaseName("ix_lrn_comment_course_chapter");

        builder.HasIndex(c => new { c.ParentCommentId, c.CreatedAt })
            .HasDatabaseName("ix_lrn_comment_parent");

        builder.HasIndex(c => new { c.CourseId, c.IsPinned, c.DeletedAt })
            .HasDatabaseName("ix_lrn_comment_pinned");

        builder.HasOne(c => c.ParentComment)
            .WithMany(p => p.Replies)
            .HasForeignKey(c => c.ParentCommentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
