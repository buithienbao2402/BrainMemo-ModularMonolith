using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Course.Infrastructure.Persistence.Configurations;

public sealed class EnrollmentConfiguration : IEntityTypeConfiguration<Enrollment>
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
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(e => e.FirstEnrolledAt)
            .HasColumnName("first_enrolled_at")
            .HasPrecision(3);

        builder.Property(e => e.StatusChangedAt)
            .HasColumnName("status_changed_at")
            .HasPrecision(3)
            .IsRequired();

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at")
            .HasPrecision(3)
            .IsRequired();

        builder.Property(e => e.UpdatedAt)
            .HasColumnName("updated_at")
            .HasPrecision(3)
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
