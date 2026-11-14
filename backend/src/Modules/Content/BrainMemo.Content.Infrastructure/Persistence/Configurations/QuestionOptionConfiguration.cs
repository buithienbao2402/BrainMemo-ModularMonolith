using BrainMemo.Content.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Content.Infrastructure.Persistence.Configurations;

public class QuestionOptionConfiguration : IEntityTypeConfiguration<QuestionOption>
{
    public void Configure(EntityTypeBuilder<QuestionOption> builder)
    {
        builder.ToTable("cnt_question_option");

        builder.HasKey(o => o.Id);
        builder.Property(o => o.Id).HasColumnName("id");
        builder.Property(o => o.QuestionId).HasColumnName("question_id").IsRequired();
        builder.Property(o => o.Position).HasColumnName("position").IsRequired();
        builder.Property(o => o.Content).HasColumnName("content").HasColumnType("text").IsRequired();
        builder.Property(o => o.MatchContent).HasColumnName("match_content").HasColumnType("text");
        builder.Property(o => o.BlankNo).HasColumnName("blank_no");
        builder.Property(o => o.IsCorrect).HasColumnName("is_correct").IsRequired();

        builder.HasIndex(o => new { o.QuestionId, o.Position })
            .HasDatabaseName("ix_cnt_question_option_question");

        builder.HasOne<Question>()
            .WithMany()
            .HasForeignKey(o => o.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
