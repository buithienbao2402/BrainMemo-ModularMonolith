using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Course.Infrastructure.Persistence.Configurations;

public sealed class EnrollmentRequestConfiguration : IEntityTypeConfiguration<EnrollmentRequest>
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
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(r => r.RequestedAt)
            .HasColumnName("requested_at")
            .HasPrecision(3)
            .IsRequired();

        builder.Property(r => r.DecidedAt)
            .HasColumnName("decided_at")
            .HasPrecision(3);

        builder.Property(r => r.DecidedByUserId)
            .HasColumnName("decided_by_user_id");

        builder.HasIndex(r => new { r.CourseId, r.Decision, r.RequestedAt })
            .HasDatabaseName("ix_crs_enrollment_request_decision");
    }
}
