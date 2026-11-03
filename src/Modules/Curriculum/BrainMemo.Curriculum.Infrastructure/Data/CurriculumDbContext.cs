using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Curriculum.Infrastructure.Data;

public class CurriculumDbContext : DbContext
{
    public CurriculumDbContext(DbContextOptions<CurriculumDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("brainmemo_curriculum");
        base.OnModelCreating(modelBuilder);
    }
}