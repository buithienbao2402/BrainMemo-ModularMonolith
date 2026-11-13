using BrainMemo.Course.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Course.Infrastructure.Persistence.Configurations;

internal sealed class CourseTagConfiguration : IEntityTypeConfiguration<CourseTag>
{
    public void Configure(EntityTypeBuilder<CourseTag> builder)
    {
        builder.ToTable("crs_course_tag");

        builder.HasKey(t => new { t.CourseId, t.Tag });

        builder.Property(t => t.CourseId)
            .HasColumnName("course_id")
            .IsRequired();

        builder.Property(t => t.Tag)
            .HasColumnName("tag")
            .HasMaxLength(Domain.Entities.Course.MaxTagLength)
            .UseCollation("utf8mb4_0900_as_ci")
            .IsRequired();

        builder.HasIndex(t => new { t.Tag, t.CourseId })
            .HasDatabaseName("ix_crs_course_tag_tag");
    }
}
