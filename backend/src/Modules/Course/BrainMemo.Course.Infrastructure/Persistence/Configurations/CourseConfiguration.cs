using BrainMemo.Course.Infrastructure.Persistence.Converters;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Infrastructure.Persistence.Configurations;

public sealed class CourseConfiguration : IEntityTypeConfiguration<CourseEntity>
{
    public void Configure(EntityTypeBuilder<CourseEntity> builder)
    {
        builder.ToTable("crs_course");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(c => c.OwnerUserId)
            .HasColumnName("owner_user_id")
            .IsRequired();

        builder.Property(c => c.Name)
            .HasColumnName("name")
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(c => c.Description)
            .HasColumnName("description")
            .HasColumnType("text");

        builder.Property(c => c.CoverStorageKey)
            .HasColumnName("cover_storage_key")
            .HasMaxLength(500);

        builder.Property(c => c.AccessMode)
            .HasColumnName("access_mode")
            .HasConversion<CourseAccessModeValueConverter>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(c => c.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(c => c.PublishStatus)
            .HasColumnName("publish_status")
            .HasConversion<CoursePublishStatusValueConverter>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(c => c.SubmittedForReviewAt)
            .HasColumnName("submitted_for_review_at")
            .HasPrecision(3);

        builder.Property(c => c.PublishedAt)
            .HasColumnName("published_at")
            .HasPrecision(3);

        builder.Property(c => c.RejectionReason)
            .HasColumnName("rejection_reason")
            .HasMaxLength(1000);

        builder.Property(c => c.ReviewedByAdminId)
            .HasColumnName("reviewed_by_admin_id");

        builder.Property(c => c.ReviewedAt)
            .HasColumnName("reviewed_at")
            .HasPrecision(3);

        builder.Property(c => c.HiddenAt)
            .HasColumnName("hidden_at")
            .HasPrecision(3);

        builder.Property(c => c.HiddenSanctionId)
            .HasColumnName("hidden_sanction_id");

        builder.Property(c => c.DeletedAt)
            .HasColumnName("deleted_at")
            .HasPrecision(3);

        builder.Property(c => c.Revision)
            .HasColumnName("revision")
            .IsRequired();

        builder.Property(c => c.CreatedAt)
            .HasColumnName("created_at")
            .HasPrecision(3)
            .IsRequired();

        builder.Property(c => c.UpdatedAt)
            .HasColumnName("updated_at")
            .HasPrecision(3)
            .IsRequired();

        builder.HasMany(c => c.Tags)
            .WithOne()
            .HasForeignKey(t => t.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(c => new { c.OwnerUserId, c.DeletedAt, c.CreatedAt })
            .HasDatabaseName("ix_crs_course_owner");

        builder.Ignore(c => c.IsHidden);
        builder.Ignore(c => c.IsDeleted);
        builder.Ignore(c => c.DomainEvents);
    }
}
