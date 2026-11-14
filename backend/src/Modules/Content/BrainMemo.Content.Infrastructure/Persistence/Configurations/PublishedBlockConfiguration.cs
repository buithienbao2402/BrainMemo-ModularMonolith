using BrainMemo.Content.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Content.Infrastructure.Persistence.Configurations;

public class PublishedBlockConfiguration : IEntityTypeConfiguration<PublishedBlock>
{
    public void Configure(EntityTypeBuilder<PublishedBlock> builder)
    {
        builder.ToTable("cnt_published_block");

        builder.HasKey(p => p.BlockId);
        builder.Property(p => p.BlockId).HasColumnName("block_id");
        builder.Property(p => p.ChapterId).HasColumnName("chapter_id").IsRequired();
        builder.Property(p => p.BlockType).HasColumnName("block_type").HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(p => p.Position).HasColumnName("position").IsRequired();
        builder.Property(p => p.ResourceId).HasColumnName("resource_id");
        builder.Property(p => p.QuestionId).HasColumnName("question_id");
        builder.Property(p => p.VersionNo).HasColumnName("version_no").IsRequired();

        builder.HasIndex(p => new { p.ChapterId, p.Position })
            .HasDatabaseName("ix_cnt_published_block_chapter_pos");
        builder.HasIndex(p => p.ResourceId)
            .HasDatabaseName("ix_cnt_published_block_resource");

        builder.HasOne<Chapter>()
            .WithMany()
            .HasForeignKey(p => p.ChapterId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Resource>()
            .WithMany()
            .HasForeignKey(p => p.ResourceId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
