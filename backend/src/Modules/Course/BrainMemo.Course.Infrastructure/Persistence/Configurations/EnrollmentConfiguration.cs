using BrainMemo.Course.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Course.Infrastructure.Persistence.Configurations;

internal sealed class EnrollmentConfiguration : IEntityTypeConfiguration<Enrollment>
{
    public void Configure(EntityTypeBuilder<Enrollment> builder)
    {
        builder.ToTable("crs_enrollment");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(e => e.CourseId)
            .HasColumnName("course_id")
            .IsRequired();

        builder.Property(e => e.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(e => e.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .IsRequired();

        builder.Property(e => e.FirstEnrolledAt)
            .HasColumnName("first_enrolled_at");

        builder.Property(e => e.StatusChangedAt)
            .HasColumnName("status_changed_at")
            .IsRequired();

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.Property(e => e.UpdatedAt)
            .HasColumnName("updated_at")
            .IsRequired();

        builder.HasIndex(e => new { e.CourseId, e.UserId })
            .IsUnique()
            .HasDatabaseName("uk_crs_enrollment_course_user");

        builder.HasIndex(e => new { e.CourseId, e.Status, e.StatusChangedAt })
            .HasDatabaseName("ix_crs_enrollment_course_status");

        builder.HasIndex(e => new { e.UserId, e.Status, e.StatusChangedAt })
            .HasDatabaseName("ix_crs_enrollment_user_status");
    }
}
