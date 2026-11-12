using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.Identity.Infrastructure.Persistence.Converters;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Identity.Infrastructure.Persistence.Configurations;

internal sealed class UserTokenConfiguration : IEntityTypeConfiguration<UserToken>
{
    public void Configure(EntityTypeBuilder<UserToken> builder)
    {
        builder.ToTable("idn_user_token");

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

        builder.Property(x => x.Purpose)
            .HasColumnName("purpose")
            .HasColumnType("enum('VERIFY_EMAIL','RESET_PASSWORD')")
            .HasConversion(
                v => v.ToDatabaseValue(),
                v => UserTokenPurposeExtensions.ParseUserTokenPurpose(v))
            .IsRequired();

        builder.Property(x => x.TokenHash)
            .HasColumnName("token_hash")
            .HasColumnType($"binary({Domain.ValueObjects.TokenHash.ExpectedByteLength})")
            .HasMaxLength(Domain.ValueObjects.TokenHash.ExpectedByteLength)
            .IsRequired();

        builder.Property(x => x.ExpiresAt)
            .HasColumnName("expires_at")
            .HasColumnType("datetime(3)")
            .HasConversion(new UtcDateTimeOffsetConverter())
            .IsRequired();

        builder.Property(x => x.ConsumedAt)
            .HasColumnName("consumed_at")
            .HasColumnType("datetime(3)")
            .HasConversion(new NullableUtcDateTimeOffsetConverter());

        builder.Property(x => x.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("datetime(3)")
            .HasConversion(new UtcDateTimeOffsetConverter())
            .HasDefaultValueSql("CURRENT_TIMESTAMP(3)")
            .IsRequired();

        builder.HasIndex(x => x.TokenHash)
            .IsUnique()
            .HasDatabaseName("uk_idn_token_hash");

        builder.HasIndex(x => new { x.UserId, x.Purpose, x.ConsumedAt, x.ExpiresAt })
            .HasDatabaseName("ix_idn_token_user_purpose");
    }
}

