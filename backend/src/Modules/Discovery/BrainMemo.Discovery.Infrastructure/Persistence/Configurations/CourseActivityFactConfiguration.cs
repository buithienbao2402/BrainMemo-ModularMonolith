using BrainMemo.Discovery.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Discovery.Infrastructure.Persistence.Configurations;

public sealed class CourseActivityFactConfiguration : IEntityTypeConfiguration<CourseActivityFact>
{
    public void Configure(EntityTypeBuilder<CourseActivityFact> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("dsc_course_activity_fact");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.Id)
            .HasColumnName("id")
            .HasColumnType("binary(16)")
            .IsRequired();

        builder.Property(f => f.CourseId)
            .HasColumnName("course_id")
            .HasColumnType("binary(16)")
            .IsRequired();

        builder.Property(f => f.ActivityType)
            .HasColumnName("activity_type")
            .HasColumnType("enum('ENROLLMENT_NEW','REVIEW_NEW','NOMINATION_NEW','NOMINATION_WITHDRAWN')")
            .IsRequired();

        builder.Property(f => f.UserId)
            .HasColumnName("user_id")
            .HasColumnType("binary(16)");

        builder.Property(f => f.SourceEventId)
            .HasColumnName("source_event_id")
            .HasColumnType("binary(16)")
            .IsRequired();

        builder.Property(f => f.OccurredAt)
            .HasColumnName("occurred_at")
            .HasColumnType("datetime(3)")
            .IsRequired();

        builder.HasIndex(f => f.SourceEventId)
            .IsUnique()
            .HasDatabaseName("uk_dsc_fact_source_event");

        builder.HasIndex(f => new { f.CourseId, f.ActivityType, f.OccurredAt })
            .HasDatabaseName("ix_dsc_fact_course_type_time");

        builder.HasIndex(f => new { f.ActivityType, f.OccurredAt })
            .HasDatabaseName("ix_dsc_fact_type_time");
    }
}
