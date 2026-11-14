using BrainMemo.Content.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Content.Infrastructure.Persistence.Configurations;

public class QuestionTagConfiguration : IEntityTypeConfiguration<QuestionTag>
{
    public void Configure(EntityTypeBuilder<QuestionTag> builder)
    {
        builder.ToTable("cnt_question_tag");

        builder.HasKey(t => new { t.QuestionId, t.Tag });
        builder.Property(t => t.QuestionId).HasColumnName("question_id").IsRequired();
        builder.Property(t => t.Tag).HasColumnName("tag").HasMaxLength(50).IsRequired();

        builder.HasIndex(t => new { t.Tag, t.QuestionId })
            .HasDatabaseName("ix_cnt_question_tag_tag");

        builder.HasOne<Question>()
            .WithMany()
            .HasForeignKey(t => t.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
