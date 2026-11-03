using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Assessment.Infrastructure.Data;

public class AssessmentDbContext : DbContext
{
    public AssessmentDbContext(DbContextOptions<AssessmentDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("brainmemo_assessment");
        base.OnModelCreating(modelBuilder);
    }
}