using System.Text.Json;
using BrainMemo.Discovery.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Discovery.Infrastructure.Persistence.Configurations;

public sealed class CourseEntryConfiguration : IEntityTypeConfiguration<CourseEntry>
{
    public void Configure(EntityTypeBuilder<CourseEntry> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("dsc_course_entry");

        builder.HasKey(e => e.CourseId);

        builder.Property(e => e.CourseId)
            .HasColumnName("course_id")
            .HasColumnType("binary(16)")
            .IsRequired();

        builder.Property(e => e.OwnerUserId)
            .HasColumnName("owner_user_id")
            .HasColumnType("binary(16)")
            .IsRequired();

        builder.Property(e => e.OwnerDisplayName)
            .HasColumnName("owner_display_name")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(e => e.Name)
            .HasColumnName("name")
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(e => e.Description)
            .HasColumnName("description")
            .HasColumnType("text");

        builder.Property(e => e.CoverStorageKey)
            .HasColumnName("cover_storage_key")
            .HasMaxLength(500);

        builder.Property(e => e.AccessMode)
            .HasColumnName("access_mode")
            .HasColumnType("enum('PUBLIC','PRIVATE')")
            .IsRequired();

        builder.Property(e => e.CourseStatus)
            .HasColumnName("course_status")
            .HasColumnType("enum('UPDATING','COMPLETED','PAUSED')")
            .IsRequired();

        ValueComparer<IReadOnlyList<string>?> tagListComparer = new(
            (c1, c2) => c1 == null && c2 == null || c1 != null && c2 != null && c1.SequenceEqual(c2),
            c => c == null ? 0 : c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
            c => c == null ? null : c.ToList());

        builder.Property(e => e.TagList)
            .HasColumnName("tag_list")
            .HasColumnType("json")
            .HasConversion(
                v => v == null ? null : JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => string.IsNullOrWhiteSpace(v) ? null : JsonSerializer.Deserialize<IReadOnlyList<string>>(v, (JsonSerializerOptions?)null))
            .Metadata.SetValueComparer(tagListComparer);

        builder.Property(e => e.LearnerCount)
            .HasColumnName("learner_count")
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(e => e.ReviewCount)
            .HasColumnName("review_count")
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(e => e.AvgRating)
            .HasColumnName("avg_rating")
            .HasPrecision(3, 2);

        builder.Property(e => e.NominationCount)
            .HasColumnName("nomination_count")
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(e => e.CommentCount)
            .HasColumnName("comment_count")
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(e => e.PublishedChapterCount)
            .HasColumnName("published_chapter_count")
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(e => e.LastUpdatedAt)
            .HasColumnName("last_updated_at")
            .HasColumnType("datetime(3)")
            .IsRequired();

        builder.Property(e => e.FirstPublishedAt)
            .HasColumnName("first_published_at")
            .HasColumnType("datetime(3)");

        builder.Property(e => e.SourceRevision)
            .HasColumnName("source_revision")
            .IsRequired();

        builder.Property(e => e.SyncedAt)
            .HasColumnName("synced_at")
            .HasColumnType("datetime(3)")
            .IsRequired()
            .HasDefaultValueSql("CURRENT_TIMESTAMP(3)");

        builder.HasIndex(e => new { e.AccessMode, e.CourseStatus, e.LastUpdatedAt })
            .HasDatabaseName("ix_dsc_entry_home");

        builder.HasIndex(e => new { e.Name, e.OwnerDisplayName })
            .HasDatabaseName("ix_dsc_entry_search");

        builder.HasIndex(e => e.LastUpdatedAt)
            .HasDatabaseName("ix_dsc_entry_last_updated");

        builder.HasIndex(e => e.FirstPublishedAt)
            .HasDatabaseName("ix_dsc_entry_first_published");

        builder.HasIndex(e => e.ReviewCount)
            .HasDatabaseName("ix_dsc_entry_review_count");

        builder.HasIndex(e => e.NominationCount)
            .HasDatabaseName("ix_dsc_entry_nomination_count");

        builder.HasIndex(e => e.LearnerCount)
            .HasDatabaseName("ix_dsc_entry_learner_count");

        builder.HasIndex(e => e.CommentCount)
            .HasDatabaseName("ix_dsc_entry_comment_count");
    }
}
