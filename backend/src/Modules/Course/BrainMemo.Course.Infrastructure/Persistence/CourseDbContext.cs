using BrainMemo.BuildingBlocks.Infrastructure.Outbox;
using BrainMemo.Course.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Infrastructure.Persistence;

public class CourseDbContext : DbContext
{
    public static readonly MySqlServerVersion DefaultMySqlServerVersion = new(new Version(8, 0, 36));

    public CourseDbContext(DbContextOptions<CourseDbContext> options)
        : base(options)
    {
    }

    public DbSet<CourseEntity> Courses => Set<CourseEntity>();
    public DbSet<CourseTag> CourseTags => Set<CourseTag>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<EnrollmentRequest> EnrollmentRequests => Set<EnrollmentRequest>();
    public DbSet<ChapterAccess> ChapterAccesses => Set<ChapterAccess>();
    public DbSet<ChapterUnlock> ChapterUnlocks => Set<ChapterUnlock>();
    public DbSet<Nomination> Nominations => Set<Nomination>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CourseDbContext).Assembly);
        modelBuilder.ConfigureOutboxMessage("crs_outbox_event");
    }
}
