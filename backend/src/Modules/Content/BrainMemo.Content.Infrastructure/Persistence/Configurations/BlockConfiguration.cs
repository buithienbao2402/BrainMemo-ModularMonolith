using BrainMemo.Content.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Content.Infrastructure.Persistence.Configurations;

public class BlockConfiguration : IEntityTypeConfiguration<Block>
{
    public void Configure(EntityTypeBuilder<Block> builder)
    {
        builder.ToTable("cnt_block");

        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).HasColumnName("id");
        builder.Property(b => b.ChapterId).HasColumnName("chapter_id").IsRequired();
        builder.Property(b => b.BlockType).HasColumnName("block_type").HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(b => b.Position).HasColumnName("position").IsRequired();
        builder.Property(b => b.Title).HasColumnName("title").HasMaxLength(200);
        builder.Property(b => b.Body).HasColumnName("body").HasColumnType("mediumtext");
        builder.Property(b => b.ResourceId).HasColumnName("resource_id");
        builder.Property(b => b.QuestionId).HasColumnName("question_id");
        builder.Property(b => b.Flashcards).HasColumnName("flashcards").HasColumnType("json");
        builder.Property(b => b.AiJobId).HasColumnName("ai_job_id");
        builder.Property(b => b.AiReviewStatus).HasColumnName("ai_review_status").HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(b => b.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(b => b.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.HasIndex(b => b.AiJobId)
            .IsUnique()
            .HasDatabaseName("uk_cnt_block_ai_job");
        builder.HasIndex(b => new { b.ChapterId, b.Position })
            .HasDatabaseName("ix_cnt_block_chapter_pos");
        builder.HasIndex(b => b.ResourceId)
            .HasDatabaseName("ix_cnt_block_resource");
        builder.HasIndex(b => b.QuestionId)
            .HasDatabaseName("ix_cnt_block_question");

        builder.HasOne<Chapter>()
            .WithMany()
            .HasForeignKey(b => b.ChapterId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Resource>()
            .WithMany()
            .HasForeignKey(b => b.ResourceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Question>()
            .WithMany()
            .HasForeignKey(b => b.QuestionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
