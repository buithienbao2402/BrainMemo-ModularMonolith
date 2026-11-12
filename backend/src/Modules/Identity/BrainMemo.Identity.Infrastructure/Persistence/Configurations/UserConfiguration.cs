using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.Identity.Domain.ValueObjects;
using BrainMemo.Identity.Infrastructure.Persistence.Converters;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Identity.Infrastructure.Persistence.Configurations;

internal sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    private const string LockCheckSql =
        "(account_status = 'ACTIVE' AND locked_at IS NULL AND locked_until IS NULL AND lock_reason IS NULL AND lock_sanction_id IS NULL) "
        + "OR (account_status = 'LOCKED_TEMPORARY' AND locked_at IS NOT NULL AND locked_until IS NOT NULL AND lock_reason IS NOT NULL) "
        + "OR (account_status = 'LOCKED_PERMANENT' AND locked_until IS NULL AND locked_at IS NOT NULL AND lock_reason IS NOT NULL)";

    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("idn_user", tableBuilder =>
            tableBuilder.HasCheckConstraint("ck_idn_user_lock", LockCheckSql));

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("id")
            .HasColumnType("binary(16)")
            .HasConversion(new BigEndianGuidBytesConverter())
            .ValueGeneratedNever();

        builder.Property(x => x.Email)
            .HasColumnName("email")
            .HasColumnType($"varchar({EmailAddress.MaxLength})")
            .HasMaxLength(EmailAddress.MaxLength)
            .UseCollation("utf8mb4_0900_ai_ci")
            .IsRequired();

        builder.Property(x => x.PasswordHash)
            .HasColumnName("password_hash")
            .HasColumnType($"varchar({User.MaxPasswordHashLength})")
            .HasMaxLength(User.MaxPasswordHashLength);

        builder.Property(x => x.EmailVerifiedAt)
            .HasColumnName("email_verified_at")
            .HasColumnType("datetime(3)")
            .HasConversion(new NullableUtcDateTimeOffsetConverter());

        builder.Property(x => x.AccountStatus)
            .HasColumnName("account_status")
            .HasColumnType("enum('ACTIVE','LOCKED_TEMPORARY','LOCKED_PERMANENT')")
            .HasConversion(
                v => v.ToDatabaseValue(),
                v => AccountStatusExtensions.ParseAccountStatus(v))
            .HasDefaultValue(AccountStatus.Active)
            .IsRequired();

        builder.Property(x => x.LockedAt)
            .HasColumnName("locked_at")
            .HasColumnType("datetime(3)")
            .HasConversion(new NullableUtcDateTimeOffsetConverter());

        builder.Property(x => x.LockedUntil)
            .HasColumnName("locked_until")
            .HasColumnType("datetime(3)")
            .HasConversion(new NullableUtcDateTimeOffsetConverter());

        builder.Property(x => x.LockReason)
            .HasColumnName("lock_reason")
            .HasColumnType($"varchar({User.MaxLockReasonLength})")
            .HasMaxLength(User.MaxLockReasonLength);

        builder.Property(x => x.LockSanctionId)
            .HasColumnName("lock_sanction_id")
            .HasColumnType("binary(16)")
            .HasConversion(new NullableBigEndianGuidBytesConverter())
            .HasComment("logical ref mod_sanction.id");

        builder.Property(x => x.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("datetime(3)")
            .HasConversion(new UtcDateTimeOffsetConverter())
            .HasDefaultValueSql("CURRENT_TIMESTAMP(3)")
            .IsRequired();

        builder.Property(x => x.UpdatedAt)
            .HasColumnName("updated_at")
            .HasColumnType("datetime(3)")
            .HasConversion(new UtcDateTimeOffsetConverter())
            .HasDefaultValueSql("CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)")
            .IsRequired();

        builder.HasIndex(x => x.Email)
            .IsUnique()
            .HasDatabaseName("uk_idn_user_email");

        builder.HasIndex(x => new { x.AccountStatus, x.LockedUntil })
            .HasDatabaseName("ix_idn_user_status_until");

        builder.HasMany(x => x.ExternalIdentities)
            .WithOne()
            .HasForeignKey(x => x.UserId)
            .HasConstraintName("fk_idn_ext_user")
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.RefreshSessions)
            .WithOne()
            .HasForeignKey(x => x.UserId)
            .HasConstraintName("fk_idn_session_user")
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Tokens)
            .WithOne()
            .HasForeignKey(x => x.UserId)
            .HasConstraintName("fk_idn_token_user")
            .OnDelete(DeleteBehavior.Restrict);

        builder.Navigation(x => x.ExternalIdentities)
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.Navigation(x => x.RefreshSessions)
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.Navigation(x => x.Tokens)
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

