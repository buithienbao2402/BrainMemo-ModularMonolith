using BrainMemo.Content.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Content.Infrastructure.Persistence.Configurations;

public class QuizQuestionConfiguration : IEntityTypeConfiguration<QuizQuestion>
{
    public void Configure(EntityTypeBuilder<QuizQuestion> builder)
    {
        builder.ToTable("cnt_quiz_question");

        builder.HasKey(q => new { q.QuizBlockId, q.QuestionId });
        builder.Property(q => q.QuizBlockId).HasColumnName("quiz_block_id").IsRequired();
        builder.Property(q => q.QuestionId).HasColumnName("question_id").IsRequired();
        builder.Property(q => q.Position).HasColumnName("position").IsRequired();
        builder.Property(q => q.Points).HasColumnName("points").HasPrecision(6, 2).IsRequired();

        builder.HasIndex(q => q.QuestionId)
            .HasDatabaseName("ix_cnt_quiz_question_question");

        builder.HasOne<Block>()
            .WithMany()
            .HasForeignKey(q => q.QuizBlockId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Question>()
            .WithMany()
            .HasForeignKey(q => q.QuestionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
