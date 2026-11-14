using BrainMemo.Content.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Content.Infrastructure.Persistence.Configurations;

public class QuestionBankConfiguration : IEntityTypeConfiguration<QuestionBank>
{
    public void Configure(EntityTypeBuilder<QuestionBank> builder)
    {
        builder.ToTable("cnt_question_bank");

        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).HasColumnName("id");
        builder.Property(b => b.CourseId).HasColumnName("course_id").IsRequired();
        builder.Property(b => b.DifficultyScheme).HasColumnName("difficulty_scheme").HasConversion<string>().HasMaxLength(30);
        builder.Property(b => b.CreatedAt).HasColumnName("created_at").IsRequired();

        builder.HasIndex(b => b.CourseId)
            .IsUnique()
            .HasDatabaseName("uk_cnt_question_bank_course");
    }
}
