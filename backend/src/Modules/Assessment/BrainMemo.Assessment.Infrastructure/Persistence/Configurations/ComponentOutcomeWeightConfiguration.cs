using BrainMemo.Assessment.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Assessment.Infrastructure.Persistence.Configurations;

public class ComponentOutcomeWeightConfiguration : IEntityTypeConfiguration<ComponentOutcomeWeight>
{
    public void Configure(EntityTypeBuilder<ComponentOutcomeWeight> builder)
    {
        builder.ToTable("ast_component_outcome_weight");

        builder.HasKey(w => w.Id);
        builder.Property(w => w.Id).HasColumnName("id");
        builder.Property(w => w.ComponentId).HasColumnName("component_id").IsRequired();
        builder.Property(w => w.CloId).HasColumnName("clo_id").IsRequired();
        builder.Property(w => w.Weight).HasColumnName("weight").HasPrecision(6, 2).IsRequired();
        builder.Property(w => w.CreatedAt).HasColumnName("created_at").IsRequired();

        builder.HasIndex(w => new { w.ComponentId, w.CloId }, "uk_ast_outcome_weight_component_clo").IsUnique();
        builder.HasIndex(w => w.CloId, "ix_ast_outcome_weight_clo");
    }
}
