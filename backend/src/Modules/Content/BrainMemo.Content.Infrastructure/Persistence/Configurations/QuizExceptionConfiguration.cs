using BrainMemo.Content.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Content.Infrastructure.Persistence.Configurations;

public class QuizExceptionConfiguration : IEntityTypeConfiguration<QuizException>
{
    public void Configure(EntityTypeBuilder<QuizException> builder)
    {
        builder.ToTable("cnt_quiz_exception");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");
        builder.Property(e => e.CourseId).HasColumnName("course_id").IsRequired();
        builder.Property(e => e.QuizBlockId).HasColumnName("quiz_block_id").IsRequired();
        builder.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(e => e.ExtraMinutes).HasColumnName("extra_minutes");
        builder.Property(e => e.ExtraAttempts).HasColumnName("extra_attempts");
        builder.Property(e => e.ExtendedCloseAt).HasColumnName("extended_close_at");
        builder.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(e => e.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.HasIndex(e => new { e.QuizBlockId, e.UserId })
            .IsUnique()
            .HasDatabaseName("uk_cnt_quiz_exception_block_user");
        builder.HasIndex(e => e.CourseId)
            .HasDatabaseName("ix_cnt_quiz_exception_course");
    }
}
