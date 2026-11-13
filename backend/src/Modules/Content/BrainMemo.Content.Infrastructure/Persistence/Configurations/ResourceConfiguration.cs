using BrainMemo.Content.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Content.Infrastructure.Persistence.Configurations;

public class ResourceConfiguration : IEntityTypeConfiguration<Resource>
{
    public void Configure(EntityTypeBuilder<Resource> builder)
    {
        builder.ToTable("cnt_resource");

        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasColumnName("id");
        builder.Property(r => r.CourseId).HasColumnName("course_id").IsRequired();
        builder.Property(r => r.Kind).HasColumnName("kind").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(r => r.OriginalFilename).HasColumnName("original_filename").HasMaxLength(255).IsRequired();
        builder.Property(r => r.ContentType).HasColumnName("content_type").HasMaxLength(100).IsRequired();
        builder.Property(r => r.SizeBytes).HasColumnName("size_bytes").IsRequired();
        builder.Property(r => r.StorageKey).HasColumnName("storage_key").HasMaxLength(500).IsRequired();
        builder.Property(r => r.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(r => r.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(r => r.StorageKey)
            .IsUnique()
            .HasDatabaseName("uk_cnt_resource_storage_key");
        builder.HasIndex(r => new { r.CourseId, r.DeletedAt, r.CreatedAt })
            .HasDatabaseName("ix_cnt_resource_course");
    }
}
