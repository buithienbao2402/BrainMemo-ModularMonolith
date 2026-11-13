using BrainMemo.Course.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Course.Infrastructure.Persistence.Configurations;

internal sealed class NominationConfiguration : IEntityTypeConfiguration<Nomination>
{
    public void Configure(EntityTypeBuilder<Nomination> builder)
    {
        builder.ToTable("crs_nomination");

        builder.HasKey(n => n.Id);

        builder.Property(n => n.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(n => n.CourseId)
            .HasColumnName("course_id")
            .IsRequired();

        builder.Property(n => n.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(n => n.NominatedAt)
            .HasColumnName("nominated_at")
            .IsRequired();

        builder.Property(n => n.WithdrawnAt)
            .HasColumnName("withdrawn_at");

        builder.Property(n => n.ActiveMarker)
            .HasColumnName("active_marker");

        builder.HasIndex(n => new { n.CourseId, n.UserId, n.ActiveMarker })
            .IsUnique()
            .HasDatabaseName("uk_crs_nomination_active");

        builder.HasIndex(n => new { n.CourseId, n.ActiveMarker })
            .HasDatabaseName("ix_crs_nomination_course_active");

        builder.HasIndex(n => new { n.CourseId, n.NominatedAt })
            .HasDatabaseName("ix_crs_nomination_course_time");
    }
}
