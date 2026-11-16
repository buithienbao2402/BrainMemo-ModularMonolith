using System.Text.Json;
using BrainMemo.Assessment.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Assessment.Infrastructure.Persistence.Configurations;

public class CloConfiguration : IEntityTypeConfiguration<Clo>
{
    public void Configure(EntityTypeBuilder<Clo> builder)
    {
        builder.ToTable("ast_clo");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.CourseId).HasColumnName("course_id").IsRequired();
        builder.Property(c => c.Code).HasColumnName("code").HasMaxLength(30).IsRequired();
        builder.Property(c => c.Description).HasColumnName("description").HasColumnType("text").IsRequired();
        builder.Property(c => c.BloomLevelCode).HasColumnName("bloom_level_code").HasMaxLength(50);
        builder.Property(c => c.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(c => c.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.Property(c => c.LinkedPloIds)
            .HasColumnName("linked_plo_ids")
            .HasColumnType("json")
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => string.IsNullOrEmpty(v)
                    ? new List<Guid>()
                    : JsonSerializer.Deserialize<List<Guid>>(v, (JsonSerializerOptions?)null) ?? new List<Guid>());

        builder.HasIndex(c => new { c.CourseId, c.Code }, "uk_ast_clo_course_code").IsUnique();
        builder.HasIndex(c => c.CourseId, "ix_ast_clo_course");
    }
}
