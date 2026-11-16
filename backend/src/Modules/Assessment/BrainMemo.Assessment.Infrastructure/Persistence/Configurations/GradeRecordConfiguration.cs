using BrainMemo.Assessment.Domain.Entities;
using BrainMemo.Assessment.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Assessment.Infrastructure.Persistence.Configurations;

public class GradeRecordConfiguration : IEntityTypeConfiguration<GradeRecord>
{
    public void Configure(EntityTypeBuilder<GradeRecord> builder)
    {
        builder.ToTable("ast_grade_record");

        builder.HasKey(g => g.Id);
        builder.Property(g => g.Id).HasColumnName("id");
        builder.Property(g => g.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(g => g.CourseId).HasColumnName("course_id").IsRequired();
        builder.Property(g => g.ComponentId).HasColumnName("component_id").IsRequired();

        builder.Property(g => g.RecordType)
            .HasColumnName("record_type")
            .HasMaxLength(30)
            .HasConversion(
                v => v == GradeRecordType.QuizAttempt ? "QUIZ_ATTEMPT" :
                     v == GradeRecordType.AssignmentSubmission ? "ASSIGNMENT_SUBMISSION" : "COMPONENT_FINAL",
                v => v == "QUIZ_ATTEMPT" ? GradeRecordType.QuizAttempt :
                     v == "ASSIGNMENT_SUBMISSION" ? GradeRecordType.AssignmentSubmission : GradeRecordType.ComponentFinal)
            .IsRequired();

        builder.Property(g => g.SourceAttemptId).HasColumnName("source_attempt_id");
        builder.Property(g => g.SourceSubmissionId).HasColumnName("source_submission_id");
        builder.Property(g => g.Score).HasColumnName("score").HasPrecision(6, 2);
        builder.Property(g => g.MaxScore).HasColumnName("max_score").HasPrecision(6, 2);
        builder.Property(g => g.IsFullyGraded).HasColumnName("is_fully_graded").IsRequired();
        builder.Property(g => g.GradedAt).HasColumnName("graded_at");
        builder.Property(g => g.Feedback).HasColumnName("feedback");
        builder.Property(g => g.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(g => g.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.HasIndex(g => g.SourceAttemptId, "uk_ast_grade_source_attempt").IsUnique();
        builder.HasIndex(g => g.SourceSubmissionId, "uk_ast_grade_source_submission").IsUnique();
    }
}
