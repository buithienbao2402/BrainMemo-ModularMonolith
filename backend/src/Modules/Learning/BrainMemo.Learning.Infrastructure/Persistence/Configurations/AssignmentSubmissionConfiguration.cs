using BrainMemo.Learning.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Learning.Infrastructure.Persistence.Configurations;

public class AssignmentSubmissionConfiguration : IEntityTypeConfiguration<AssignmentSubmission>
{
    public void Configure(EntityTypeBuilder<AssignmentSubmission> builder)
    {
        builder.ToTable("lrn_assignment_submission");

        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id");
        builder.Property(s => s.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(s => s.CourseId).HasColumnName("course_id").IsRequired();
        builder.Property(s => s.AssignmentBlockId).HasColumnName("assignment_block_id").IsRequired();
        builder.Property(s => s.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
        builder.Property(s => s.TextContent).HasColumnName("text_content");
        builder.Property(s => s.FilesJson).HasColumnName("files");
        builder.Property(s => s.IsLate).HasColumnName("is_late");
        builder.Property(s => s.SubmittedAt).HasColumnName("submitted_at");
        builder.Property(s => s.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(s => s.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.HasIndex(s => new { s.UserId, s.AssignmentBlockId }, "uk_lrn_submission_user_block").IsUnique();
        builder.HasIndex(s => new { s.CourseId, s.Status }, "ix_lrn_submission_course_status");
    }
}
