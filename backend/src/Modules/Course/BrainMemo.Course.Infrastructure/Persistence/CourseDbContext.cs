using BrainMemo.BuildingBlocks.Infrastructure.Outbox;
using BrainMemo.Course.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Course.Infrastructure.Persistence;

/// <summary>
/// EF Core database context exclusively owning the <c>crs_*</c> Course tables (DEC-04, REPO_STRUCTURE §2 rule 4).
/// </summary>
public sealed class CourseDbContext(DbContextOptions<CourseDbContext> options)
    : DbContext(options)
{
    public static readonly MySqlServerVersion DefaultMySqlServerVersion = new(new Version(8, 0, 36));

    public DbSet<Domain.Entities.Course> Courses => Set<Domain.Entities.Course>();
    public DbSet<CourseTag> CourseTags => Set<CourseTag>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<EnrollmentRequest> EnrollmentRequests => Set<EnrollmentRequest>();
    public DbSet<ChapterAccess> ChapterAccesses => Set<ChapterAccess>();
    public DbSet<ChapterUnlock> ChapterUnlocks => Set<ChapterUnlock>();
    public DbSet<Nomination> Nominations => Set<Nomination>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        modelBuilder
            .HasCharSet("utf8mb4")
            .UseCollation("utf8mb4_0900_ai_ci");

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CourseDbContext).Assembly);

        // Configure shared table-agnostic outbox table for crs_*
        modelBuilder.ConfigureOutboxMessage("crs_outbox_event", "ix_crs_outbox_publish");

        base.OnModelCreating(modelBuilder);
    }
}
