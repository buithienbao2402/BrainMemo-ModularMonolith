using BrainMemo.Content.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Content.Infrastructure.Persistence.Configurations;

public class QuizConfigConfiguration : IEntityTypeConfiguration<QuizConfig>
{
    public void Configure(EntityTypeBuilder<QuizConfig> builder)
    {
        builder.ToTable("cnt_quiz_config");

        builder.HasKey(c => c.BlockId);
        builder.Property(c => c.BlockId).HasColumnName("block_id");
        builder.Property(c => c.OpenAt).HasColumnName("open_at");
        builder.Property(c => c.CloseAt).HasColumnName("close_at");
        builder.Property(c => c.TimeLimitMinutes).HasColumnName("time_limit_minutes");
        builder.Property(c => c.MaxAttempts).HasColumnName("max_attempts");
        builder.Property(c => c.PassScore).HasColumnName("pass_score").HasPrecision(6, 2);
        builder.Property(c => c.ResultDisplay).HasColumnName("result_display").HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(c => c.ShuffleQuestions).HasColumnName("shuffle_questions").IsRequired();
        builder.Property(c => c.ShuffleOptions).HasColumnName("shuffle_options").IsRequired();
        builder.Property(c => c.PasswordHash).HasColumnName("password_hash").HasMaxLength(100);
        builder.Property(c => c.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.HasOne<Block>()
            .WithMany()
            .HasForeignKey(c => c.BlockId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
