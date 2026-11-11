using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.Identity.Domain.ValueObjects;
using BrainMemo.Identity.Infrastructure.Persistence.Converters;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Identity.Infrastructure.Persistence.Configurations;

internal sealed class RefreshSessionConfiguration : IEntityTypeConfiguration<RefreshSession>
{
    public void Configure(EntityTypeBuilder<RefreshSession> builder)
    {
        builder.ToTable("idn_refresh_session", tableBuilder =>
            tableBuilder.HasCheckConstraint(
                "ck_idn_session_revoke",
                "(revoked_at IS NULL) = (revoke_reason IS NULL)"));

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("id")
            .HasColumnType("binary(16)")
            .HasConversion(new BigEndianGuidBytesConverter())
            .ValueGeneratedNever();

        builder.Property(x => x.UserId)
            .HasColumnName("user_id")
            .HasColumnType("binary(16)")
            .HasConversion(new BigEndianGuidBytesConverter())
            .IsRequired();

        builder.Property(x => x.TokenHash)
            .HasColumnName("token_hash")
            .HasColumnType($"binary({TokenHash.ExpectedByteLength})")
            .HasMaxLength(TokenHash.ExpectedByteLength)
            .IsRequired();

        builder.Property(x => x.UserAgent)
            .HasColumnName("user_agent")
            .HasColumnType($"varchar({RefreshSession.MaxUserAgentLength})")
            .HasMaxLength(RefreshSession.MaxUserAgentLength);

        builder.Property(x => x.IpAddress)
            .HasColumnName("ip_address")
            .HasColumnType($"varchar({RefreshSession.MaxIpAddressLength})")
            .HasMaxLength(RefreshSession.MaxIpAddressLength);

        builder.Property(x => x.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("datetime(3)")
            .HasConversion(new UtcDateTimeOffsetConverter())
            .HasDefaultValueSql("CURRENT_TIMESTAMP(3)")
            .IsRequired();

        builder.Property(x => x.LastUsedAt)
            .HasColumnName("last_used_at")
            .HasColumnType("datetime(3)")
            .HasConversion(new UtcDateTimeOffsetConverter())
            .HasDefaultValueSql("CURRENT_TIMESTAMP(3)")
            .IsRequired();

        builder.Property(x => x.ExpiresAt)
            .HasColumnName("expires_at")
            .HasColumnType("datetime(3)")
            .HasConversion(new UtcDateTimeOffsetConverter())
            .IsRequired();

        builder.Property(x => x.RevokedAt)
            .HasColumnName("revoked_at")
            .HasColumnType("datetime(3)")
            .HasConversion(new NullableUtcDateTimeOffsetConverter());

        builder.Property(x => x.RevokeReason)
            .HasColumnName("revoke_reason")
            .HasColumnType("enum('LOGOUT','USER_REVOKED','LOGOUT_ALL','ACCOUNT_LOCKED')")
            .HasConversion(
                v => v.HasValue ? v.Value.ToDatabaseValue() : null,
                v => v == null ? null : SessionRevokeReasonExtensions.ParseSessionRevokeReason(v));

        builder.HasIndex(x => x.TokenHash)
            .IsUnique()
            .HasDatabaseName("uk_idn_session_token_hash");

        builder.HasIndex(x => new { x.UserId, x.RevokedAt, x.ExpiresAt })
            .HasDatabaseName("ix_idn_session_user_active");
    }
}

