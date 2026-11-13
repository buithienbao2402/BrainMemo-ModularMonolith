using BrainMemo.Course.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Course.Infrastructure.Persistence.Configurations;

public sealed class CourseTagConfiguration : IEntityTypeConfiguration<CourseTag>
{
    public void Configure(EntityTypeBuilder<CourseTag> builder)
    {
        builder.ToTable("crs_course_tag");

        builder.HasKey(t => new { t.CourseId, t.Tag });

        builder.Property(t => t.CourseId)
            .HasColumnName("course_id")
            .ValueGeneratedNever();

        builder.Property(t => t.Tag)
            .HasColumnName("tag")
            .HasMaxLength(50)
            .IsRequired();

        builder.HasIndex(t => new { t.Tag, t.CourseId })
            .HasDatabaseName("ix_crs_course_tag_tag");
    }
}
