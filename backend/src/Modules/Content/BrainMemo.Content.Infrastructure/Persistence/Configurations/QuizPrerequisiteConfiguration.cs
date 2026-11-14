using BrainMemo.Content.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Content.Infrastructure.Persistence.Configurations;

public class QuizPrerequisiteConfiguration : IEntityTypeConfiguration<QuizPrerequisite>
{
    public void Configure(EntityTypeBuilder<QuizPrerequisite> builder)
    {
        builder.ToTable("cnt_quiz_prerequisite");

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id");
        builder.Property(p => p.QuizBlockId).HasColumnName("quiz_block_id").IsRequired();
        builder.Property(p => p.TargetKind).HasColumnName("target_kind").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(p => p.TargetId).HasColumnName("target_id").IsRequired();

        builder.HasIndex(p => new { p.QuizBlockId, p.TargetKind, p.TargetId })
            .IsUnique()
            .HasDatabaseName("uk_cnt_quiz_prerequisite");

        builder.HasOne<Block>()
            .WithMany()
            .HasForeignKey(p => p.QuizBlockId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
