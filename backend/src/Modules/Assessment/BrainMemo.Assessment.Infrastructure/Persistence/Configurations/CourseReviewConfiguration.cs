using BrainMemo.Assessment.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Assessment.Infrastructure.Persistence.Configurations;

public sealed class CourseReviewConfiguration : IEntityTypeConfiguration<CourseReview>
{
    public void Configure(EntityTypeBuilder<CourseReview> builder)
    {
        builder.ToTable("ast_course_review");

        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasColumnName("id");
        builder.Property(r => r.CourseId).HasColumnName("course_id").IsRequired();
        builder.Property(r => r.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(r => r.Rating).HasColumnName("rating").IsRequired();
        builder.Property(r => r.CommentText).HasColumnName("comment_text").HasColumnType("text");
        builder.Property(r => r.ReplyText).HasColumnName("reply_text").HasColumnType("text");
        builder.Property(r => r.RepliedAt).HasColumnName("replied_at");
        builder.Property(r => r.RepliedByUserId).HasColumnName("replied_by_user_id");
        builder.Property(r => r.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(r => r.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.HasIndex(r => new { r.CourseId, r.UserId })
            .IsUnique()
            .HasDatabaseName("uk_ast_review_course_user");

        builder.HasIndex(r => new { r.CourseId, r.CreatedAt })
            .HasDatabaseName("ix_ast_review_course_created");

        builder.HasIndex(r => new { r.CourseId, r.Rating })
            .HasDatabaseName("ix_ast_review_course_rating");

        builder.ToTable(t => t.HasCheckConstraint("ck_ast_review_rating", "rating BETWEEN 1 AND 5"));
    }
}
