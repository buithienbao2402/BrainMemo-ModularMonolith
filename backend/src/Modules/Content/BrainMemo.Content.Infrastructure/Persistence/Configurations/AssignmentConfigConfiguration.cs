using BrainMemo.Content.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Content.Infrastructure.Persistence.Configurations;

public class AssignmentConfigConfiguration : IEntityTypeConfiguration<AssignmentConfig>
{
    public void Configure(EntityTypeBuilder<AssignmentConfig> builder)
    {
        builder.ToTable("cnt_assignment_config");

        builder.HasKey(a => a.BlockId);
        builder.Property(a => a.BlockId).HasColumnName("block_id");
        builder.Property(a => a.DueAt).HasColumnName("due_at");
        builder.Property(a => a.MaxPoints).HasColumnName("max_points").HasPrecision(6, 2);
        builder.Property(a => a.MaxFileSizeBytes).HasColumnName("max_file_size_bytes").IsRequired();
        builder.Property(a => a.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.HasOne<Block>()
            .WithMany()
            .HasForeignKey(a => a.BlockId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
