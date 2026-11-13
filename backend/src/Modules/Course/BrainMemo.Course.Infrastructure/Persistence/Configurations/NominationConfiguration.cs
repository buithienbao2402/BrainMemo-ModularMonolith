using BrainMemo.Course.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Course.Infrastructure.Persistence.Configurations;

public sealed class NominationConfiguration : IEntityTypeConfiguration<Nomination>
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
            .HasPrecision(3)
            .IsRequired();

        builder.Property(n => n.WithdrawnAt)
            .HasColumnName("withdrawn_at")
            .HasPrecision(3);

        builder.HasIndex(n => new { n.CourseId, n.NominatedAt })
            .HasDatabaseName("ix_crs_nomination_course_time");

        builder.Ignore(n => n.IsActive);
    }
}
