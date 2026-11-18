using BrainMemo.Assessment.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Assessment.Infrastructure.Persistence.Configurations;

public class AssessmentComponentConfiguration : IEntityTypeConfiguration<AssessmentComponent>
{
    public void Configure(EntityTypeBuilder<AssessmentComponent> builder)
    {
        builder.ToTable("ast_assessment_component");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.CourseId).HasColumnName("course_id").IsRequired();
        builder.Property(c => c.SourceKind).HasColumnName("source_kind").HasMaxLength(20).IsRequired();
        builder.Property(c => c.SourceBlockId).HasColumnName("source_block_id").IsRequired();
        builder.Property(c => c.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
        builder.Property(c => c.MaxScore).HasColumnName("max_score").HasPrecision(6, 2).IsRequired();
        builder.Property(c => c.CourseWeight).HasColumnName("course_weight").HasPrecision(6, 2).IsRequired();
        builder.Property(c => c.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(c => c.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.HasIndex(c => new { c.CourseId, c.SourceBlockId }, "uk_ast_component_course_block").IsUnique();
    }
}
