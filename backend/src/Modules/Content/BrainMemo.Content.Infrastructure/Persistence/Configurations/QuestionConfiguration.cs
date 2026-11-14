using BrainMemo.Content.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Content.Infrastructure.Persistence.Configurations;

public class QuestionConfiguration : IEntityTypeConfiguration<Question>
{
    public void Configure(EntityTypeBuilder<Question> builder)
    {
        builder.ToTable("cnt_question");

        builder.HasKey(q => q.Id);
        builder.Property(q => q.Id).HasColumnName("id");
        builder.Property(q => q.BankId).HasColumnName("bank_id").IsRequired();
        builder.Property(q => q.QuestionType).HasColumnName("question_type").HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(q => q.AllowMultiple).HasColumnName("allow_multiple").IsRequired();
        builder.Property(q => q.Stem).HasColumnName("stem").HasColumnType("text").IsRequired();
        builder.Property(q => q.Explanation).HasColumnName("explanation").HasColumnType("text");
        builder.Property(q => q.ReferenceAnswer).HasColumnName("reference_answer").HasColumnType("text");
        builder.Property(q => q.DifficultyCode).HasColumnName("difficulty_code");
        builder.Property(q => q.DefaultPoints).HasColumnName("default_points").HasPrecision(6, 2).IsRequired();
        builder.Property(q => q.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(q => q.Origin).HasColumnName("origin").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(q => q.AiJobId).HasColumnName("ai_job_id");
        builder.Property(q => q.AiItemNo).HasColumnName("ai_item_no");
        builder.Property(q => q.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(q => q.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.HasIndex(q => new { q.AiJobId, q.AiItemNo })
            .IsUnique()
            .HasDatabaseName("uk_cnt_question_ai_item");
        builder.HasIndex(q => new { q.BankId, q.Status, q.QuestionType })
            .HasDatabaseName("ix_cnt_question_bank_status_type");
        builder.HasIndex(q => new { q.BankId, q.DifficultyCode })
            .HasDatabaseName("ix_cnt_question_bank_difficulty");

        builder.HasOne<QuestionBank>()
            .WithMany()
            .HasForeignKey(q => q.BankId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
