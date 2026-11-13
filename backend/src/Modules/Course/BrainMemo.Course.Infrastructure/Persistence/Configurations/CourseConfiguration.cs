using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Course.Infrastructure.Persistence.Configurations;

internal sealed class CourseConfiguration : IEntityTypeConfiguration<Domain.Entities.Course>
{
    public void Configure(EntityTypeBuilder<Domain.Entities.Course> builder)
    {
        builder.ToTable("crs_course");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(c => c.OwnerUserId)
            .HasColumnName("owner_user_id")
            .IsRequired();

        builder.Property(c => c.Name)
            .HasColumnName("name")
            .HasMaxLength(Domain.Entities.Course.MaxNameLength)
            .IsRequired();

        builder.Property(c => c.Description)
            .HasColumnName("description")
            .HasColumnType("text");

        builder.Property(c => c.CoverStorageKey)
            .HasColumnName("cover_storage_key")
            .HasMaxLength(500);

        builder.Property(c => c.AccessMode)
            .HasColumnName("access_mode")
            .HasConversion<string>()
            .IsRequired();

        builder.Property(c => c.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .IsRequired();

        builder.Property(c => c.HiddenAt)
            .HasColumnName("hidden_at");

        builder.Property(c => c.HiddenSanctionId)
            .HasColumnName("hidden_sanction_id");

        builder.Property(c => c.DeletedAt)
            .HasColumnName("deleted_at");

        builder.Property(c => c.Revision)
            .HasColumnName("revision")
            .IsRequired();

        builder.Property(c => c.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.Property(c => c.UpdatedAt)
            .HasColumnName("updated_at")
            .IsRequired();

        builder.HasMany(c => c.Tags)
            .WithOne()
            .HasForeignKey(t => t.CourseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(c => c.Tags)
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasIndex(c => new { c.OwnerUserId, c.DeletedAt, c.CreatedAt })
            .HasDatabaseName("ix_crs_course_owner");
    }
}
