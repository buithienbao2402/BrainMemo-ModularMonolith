using BrainMemo.Content.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Content.Infrastructure.Persistence.Configurations;

public class ChapterConfiguration : IEntityTypeConfiguration<Chapter>
{
    public void Configure(EntityTypeBuilder<Chapter> builder)
    {
        builder.ToTable("cnt_chapter");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.CourseId).HasColumnName("course_id").IsRequired();
        builder.Property(c => c.Position).HasColumnName("position").IsRequired();
        builder.Property(c => c.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
        builder.Property(c => c.Description).HasColumnName("description").HasMaxLength(1000);
        builder.Property(c => c.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(c => c.LastVersionNo).HasColumnName("last_version_no").IsRequired();
        builder.Property(c => c.PublishedVersionNo).HasColumnName("published_version_no");
        builder.Property(c => c.FirstPublishedAt).HasColumnName("first_published_at");
        builder.Property(c => c.LastPublishedAt).HasColumnName("last_published_at");
        builder.Property(c => c.DeletedAt).HasColumnName("deleted_at");
        builder.Property(c => c.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(c => c.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.HasIndex(c => new { c.CourseId, c.DeletedAt, c.Position })
            .HasDatabaseName("ix_cnt_chapter_course_pos");
        builder.HasIndex(c => new { c.CourseId, c.Status, c.DeletedAt })
            .HasDatabaseName("ix_cnt_chapter_course_status");
    }
}
