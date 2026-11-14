using BrainMemo.Content.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Content.Infrastructure.Persistence.Configurations;

public class QuizRandomRuleConfiguration : IEntityTypeConfiguration<QuizRandomRule>
{
    public void Configure(EntityTypeBuilder<QuizRandomRule> builder)
    {
        builder.ToTable("cnt_quiz_random_rule");

        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasColumnName("id");
        builder.Property(r => r.QuizBlockId).HasColumnName("quiz_block_id").IsRequired();
        builder.Property(r => r.Position).HasColumnName("position").IsRequired();
        builder.Property(r => r.PickCount).HasColumnName("pick_count").IsRequired();
        builder.Property(r => r.PointsEach).HasColumnName("points_each").HasPrecision(6, 2).IsRequired();
        builder.Property(r => r.FilterTag).HasColumnName("filter_tag").HasMaxLength(50);
        builder.Property(r => r.FilterDifficultyCode).HasColumnName("filter_difficulty_code");
        builder.Property(r => r.FilterQuestionType).HasColumnName("filter_question_type").HasConversion<string>().HasMaxLength(30);

        builder.HasIndex(r => new { r.QuizBlockId, r.Position })
            .HasDatabaseName("ix_cnt_quiz_random_rule_block");

        builder.HasOne<Block>()
            .WithMany()
            .HasForeignKey(r => r.QuizBlockId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
