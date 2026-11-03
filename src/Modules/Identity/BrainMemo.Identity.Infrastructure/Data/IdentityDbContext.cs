using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Identity.Infrastructure.Data;

public class IdentityDbContext : DbContext
{
    public IdentityDbContext(DbContextOptions<IdentityDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("brainmemo_identity");
        base.OnModelCreating(modelBuilder);
    }
}