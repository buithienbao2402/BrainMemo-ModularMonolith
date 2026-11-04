using BrainMemo.Storage.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Storage.Infrastructure.Data;

public class StorageDbContext : DbContext
{
    public StorageDbContext(DbContextOptions<StorageDbContext> options) : base(options) { }

    public DbSet<MediaFile> MediaFiles => Set<MediaFile>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<MediaFile>(entity =>
        {
            entity.ToTable("media_files");
            entity.HasKey(e => e.MediaId);
            entity.Property(e => e.MediaId).HasColumnName("media_id");
            entity.Property(e => e.OwnerId).HasColumnName("owner_id").IsRequired();
            entity.Property(e => e.ObjectKey).HasColumnName("object_key").HasMaxLength(500).IsRequired();
            entity.HasIndex(e => e.ObjectKey).IsUnique();
            entity.Property(e => e.FileName).HasColumnName("file_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.ContentType).HasColumnName("content_type").HasMaxLength(100).IsRequired();
            entity.Property(e => e.FileSizeBytes).HasColumnName("file_size_bytes").IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasConversion<string>().HasDefaultValue(MediaStatus.PENDING);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => new { e.Status, e.CreatedAt });
        });
    }
}