using BrainMemo.Assessment.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Assessment.Infrastructure.Persistence.Configurations;

public class AssessmentConfigConfiguration : IEntityTypeConfiguration<AssessmentConfig>
{
    public void Configure(EntityTypeBuilder<AssessmentConfig> builder)
    {
        builder.ToTable("ast_assessment_config");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.CourseId).HasColumnName("course_id").IsRequired();
        builder.Property(c => c.PassThreshold).HasColumnName("pass_threshold").HasPrecision(5, 2).IsRequired();
        builder.Property(c => c.ScoreSelectionRule).HasColumnName("score_selection_rule").HasMaxLength(20).IsRequired();
        builder.Property(c => c.GradeScaleJson).HasColumnName("grade_scale_json");
        builder.Property(c => c.AchievementLevelsJson).HasColumnName("achievement_levels_json");
        builder.Property(c => c.BloomScaleJson).HasColumnName("bloom_scale_json");
        builder.Property(c => c.PloEnabled).HasColumnName("plo_enabled").IsRequired();
        builder.Property(c => c.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(c => c.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.HasIndex(c => c.CourseId, "uk_ast_config_course").IsUnique();
    }
}
