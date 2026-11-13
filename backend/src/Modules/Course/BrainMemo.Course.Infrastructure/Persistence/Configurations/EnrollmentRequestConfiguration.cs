using BrainMemo.Course.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Course.Infrastructure.Persistence.Configurations;

internal sealed class EnrollmentRequestConfiguration : IEntityTypeConfiguration<EnrollmentRequest>
{
    public void Configure(EntityTypeBuilder<EnrollmentRequest> builder)
    {
        builder.ToTable("crs_enrollment_request");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(r => r.CourseId)
            .HasColumnName("course_id")
            .IsRequired();

        builder.Property(r => r.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(r => r.Decision)
            .HasColumnName("decision")
            .HasConversion<string>()
            .IsRequired();

        builder.Property(r => r.RequestedAt)
            .HasColumnName("requested_at")
            .IsRequired();

        builder.Property(r => r.DecidedAt)
            .HasColumnName("decided_at");

        builder.Property(r => r.DecidedByUserId)
            .HasColumnName("decided_by_user_id");

        builder.Property(r => r.PendingMarker)
            .HasColumnName("pending_marker");

        builder.HasIndex(r => new { r.CourseId, r.UserId, r.PendingMarker })
            .IsUnique()
            .HasDatabaseName("uk_crs_enrollment_request_pending");

        builder.HasIndex(r => new { r.CourseId, r.Decision, r.RequestedAt })
            .HasDatabaseName("ix_crs_enrollment_request_decision");
    }
}
