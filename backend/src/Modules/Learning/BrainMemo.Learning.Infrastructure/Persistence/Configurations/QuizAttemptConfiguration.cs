using BrainMemo.Learning.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Learning.Infrastructure.Persistence.Configurations;

public class QuizAttemptConfiguration : IEntityTypeConfiguration<QuizAttempt>
{
    public void Configure(EntityTypeBuilder<QuizAttempt> builder)
    {
        builder.ToTable("lrn_quiz_attempt");

        builder.HasKey(q => q.Id);
        builder.Property(q => q.Id).HasColumnName("id");
        builder.Property(q => q.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(q => q.CourseId).HasColumnName("course_id").IsRequired();
        builder.Property(q => q.QuizBlockId).HasColumnName("quiz_block_id").IsRequired();
        builder.Property(q => q.AttemptNo).HasColumnName("attempt_no").IsRequired();
        builder.Property(q => q.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
        builder.Property(q => q.StartedAt).HasColumnName("started_at").IsRequired();
        builder.Property(q => q.DeadlineAt).HasColumnName("deadline_at").IsRequired();
        builder.Property(q => q.SubmittedAt).HasColumnName("submitted_at");
        builder.Property(q => q.GradedAt).HasColumnName("graded_at");
        builder.Property(q => q.TotalScore).HasColumnName("total_score").HasPrecision(6, 2);
        builder.Property(q => q.MaxScore).HasColumnName("max_score").HasPrecision(6, 2).IsRequired();
        builder.Property(q => q.QuestionSnapshot).HasColumnName("question_snapshot").IsRequired();
        builder.Property(q => q.CreatedAt).HasColumnName("created_at").IsRequired();

        builder.HasIndex(q => new { q.UserId, q.QuizBlockId, q.AttemptNo }, "uk_lrn_quiz_attempt_user_quiz_no").IsUnique();
        builder.HasIndex(q => new { q.UserId, q.CourseId, q.QuizBlockId, q.Status }, "ix_lrn_quiz_attempt_gradebook");
        builder.HasIndex(q => new { q.Status, q.DeadlineAt }, "ix_lrn_quiz_attempt_deadline");
    }
}
