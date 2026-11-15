using BrainMemo.Learning.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Learning.Infrastructure.Persistence.Configurations;

public sealed class BookmarkConfiguration : IEntityTypeConfiguration<Bookmark>
{
    public void Configure(EntityTypeBuilder<Bookmark> builder)
    {
        builder.ToTable("lrn_bookmark");

        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).HasColumnName("id");

        builder.Property(b => b.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(b => b.CourseId)
            .HasColumnName("course_id")
            .IsRequired();

        builder.Property(b => b.ChapterId)
            .HasColumnName("chapter_id")
            .IsRequired();

        builder.Property(b => b.CreatedAt)
            .HasColumnName("created_at")
            .HasPrecision(3)
            .IsRequired();

        builder.Property(b => b.UpdatedAt)
            .HasColumnName("updated_at")
            .HasPrecision(3)
            .IsRequired();

        builder.HasIndex(b => new { b.UserId, b.CourseId })
            .IsUnique()
            .HasDatabaseName("uk_lrn_bookmark_user_course");

        builder.HasIndex(b => new { b.UserId, b.UpdatedAt })
            .HasDatabaseName("ix_lrn_bookmark_user_updated");
    }
}
