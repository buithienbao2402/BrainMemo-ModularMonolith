using BrainMemo.Learning.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Learning.Infrastructure.Persistence.Configurations;

public sealed class CourseCompletionConfiguration : IEntityTypeConfiguration<CourseCompletion>
{
    public void Configure(EntityTypeBuilder<CourseCompletion> builder)
    {
        builder.ToTable("lrn_course_completion");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");

        builder.Property(c => c.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(c => c.CourseId)
            .HasColumnName("course_id")
            .IsRequired();

        builder.Property(c => c.CompletedAt)
            .HasColumnName("completed_at")
            .HasPrecision(3)
            .IsRequired();

        builder.HasIndex(c => new { c.UserId, c.CourseId })
            .IsUnique()
            .HasDatabaseName("uk_lrn_course_completion_user_course");

        builder.HasIndex(c => new { c.CourseId, c.CompletedAt })
            .HasDatabaseName("ix_lrn_course_completion_course");
    }
}
