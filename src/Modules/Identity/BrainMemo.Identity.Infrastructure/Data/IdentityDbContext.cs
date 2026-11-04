using BrainMemo.Identity.Application.Interfaces;
using BrainMemo.Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Identity.Infrastructure.Data;

public class IdentityDbContext : DbContext, IIdentityDbContext
{
    public IdentityDbContext(DbContextOptions<IdentityDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<EmailOtp> EmailOtps => Set<EmailOtp>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(150).IsRequired();
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash").HasMaxLength(255).IsRequired();
            entity.Property(e => e.FullName).HasColumnName("full_name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.AvatarMediaId).HasColumnName("avatar_media_id");
            entity.Property(e => e.Bio).HasColumnName("bio");
            entity.Property(e => e.IsActive).HasColumnName("is_active").HasDefaultValue(false);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.ToTable("user_roles");
            entity.HasKey(e => new { e.UserId, e.Role });
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Role).HasColumnName("role").HasConversion<string>();

            entity.HasOne(e => e.User)
                  .WithMany(u => u.UserRoles)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EmailOtp>(entity =>
        {
            entity.ToTable("email_otps");
            entity.HasKey(e => e.OtpId);
            entity.Property(e => e.OtpId).HasColumnName("otp_id");
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(150).IsRequired();
            entity.Property(e => e.OtpCode).HasColumnName("otp_code").HasMaxLength(6).IsRequired();
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at").IsRequired();
            entity.Property(e => e.IsUsed).HasColumnName("is_used").HasDefaultValue(false);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => new { e.Email, e.OtpCode });
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.HasKey(e => e.TokenId);
            entity.Property(e => e.TokenId).HasColumnName("token_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.TokenHash).HasColumnName("token_hash").HasMaxLength(64).IsRequired();
            entity.HasIndex(e => e.TokenHash).IsUnique();
            entity.Property(e => e.ReplacedByTokenId).HasColumnName("replaced_by_token_id");
            entity.Property(e => e.IsRevoked).HasColumnName("is_revoked").HasDefaultValue(false);
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.User)
                  .WithMany(u => u.RefreshTokens)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}