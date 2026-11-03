using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Storage.Infrastructure.Data;

public class StorageDbContext : DbContext
{
    public StorageDbContext(DbContextOptions<StorageDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("brainmemo_storage");
        base.OnModelCreating(modelBuilder);
    }
}