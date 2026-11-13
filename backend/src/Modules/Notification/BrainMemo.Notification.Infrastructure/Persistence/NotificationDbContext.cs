using BrainMemo.Notification.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Notification.Infrastructure.Persistence;

/// <summary>
/// EF Core database context exclusively owning the three <c>ntf_*</c> Notification tables.
/// </summary>
public sealed class NotificationDbContext(DbContextOptions<NotificationDbContext> options)
    : DbContext(options)
{
    public static readonly MySqlServerVersion DefaultMySqlServerVersion = new(new Version(8, 0, 36));

    public DbSet<Announcement> Announcements => Set<Announcement>();

    public DbSet<NotificationItem> Notifications => Set<NotificationItem>();

    public DbSet<EmailDelivery> EmailDeliveries => Set<EmailDelivery>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        modelBuilder
            .HasCharSet("utf8mb4")
            .UseCollation("utf8mb4_0900_ai_ci");

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(NotificationDbContext).Assembly);

        base.OnModelCreating(modelBuilder);
    }
}
