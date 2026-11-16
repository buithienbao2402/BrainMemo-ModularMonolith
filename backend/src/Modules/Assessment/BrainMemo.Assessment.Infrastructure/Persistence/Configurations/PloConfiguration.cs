using BrainMemo.Assessment.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Assessment.Infrastructure.Persistence.Configurations;

public class PloConfiguration : IEntityTypeConfiguration<Plo>
{
    public void Configure(EntityTypeBuilder<Plo> builder)
    {
        builder.ToTable("ast_plo");

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id");
        builder.Property(p => p.CourseId).HasColumnName("course_id").IsRequired();
        builder.Property(p => p.Code).HasColumnName("code").HasMaxLength(30).IsRequired();
        builder.Property(p => p.Description).HasColumnName("description").HasColumnType("text").IsRequired();
        builder.Property(p => p.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(p => p.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.HasIndex(p => new { p.CourseId, p.Code }, "uk_ast_plo_course_code").IsUnique();
    }
}
