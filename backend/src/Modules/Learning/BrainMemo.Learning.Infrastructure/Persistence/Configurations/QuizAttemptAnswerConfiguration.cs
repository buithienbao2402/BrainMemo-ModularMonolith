using BrainMemo.Learning.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Learning.Infrastructure.Persistence.Configurations;

public class QuizAttemptAnswerConfiguration : IEntityTypeConfiguration<QuizAttemptAnswer>
{
    public void Configure(EntityTypeBuilder<QuizAttemptAnswer> builder)
    {
        builder.ToTable("lrn_quiz_attempt_answer");

        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasColumnName("id");
        builder.Property(a => a.AttemptId).HasColumnName("attempt_id").IsRequired();
        builder.Property(a => a.QuestionId).HasColumnName("question_id").IsRequired();
        builder.Property(a => a.QuestionPosition).HasColumnName("question_position").IsRequired();
        builder.Property(a => a.AnswerPayload).HasColumnName("answer_payload");
        builder.Property(a => a.IsCorrect).HasColumnName("is_correct");
        builder.Property(a => a.PointsEarned).HasColumnName("points_earned").HasPrecision(6, 2);
        builder.Property(a => a.MaxPoints).HasColumnName("max_points").HasPrecision(6, 2).IsRequired();
        builder.Property(a => a.AnsweredAt).HasColumnName("answered_at");
        builder.Property(a => a.GradedAt).HasColumnName("graded_at");
        builder.Property(a => a.GradedByUserId).HasColumnName("graded_by_user_id");
        builder.Property(a => a.GraderFeedback).HasColumnName("grader_feedback");

        builder.HasIndex(a => new { a.AttemptId, a.QuestionId }, "uk_lrn_answer_attempt_question").IsUnique();
        builder.HasIndex(a => new { a.QuestionId, a.IsCorrect }, "ix_lrn_answer_question_correct");
    }
}
