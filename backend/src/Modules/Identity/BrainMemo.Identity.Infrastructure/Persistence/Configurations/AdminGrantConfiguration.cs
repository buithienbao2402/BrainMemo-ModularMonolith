using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Infrastructure.Persistence.Converters;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Identity.Infrastructure.Persistence.Configurations;

internal sealed class AdminGrantConfiguration : IEntityTypeConfiguration<AdminGrant>
{
    public const string ActiveMarkerPropertyName = "ActiveMarker";

    public void Configure(EntityTypeBuilder<AdminGrant> builder)
    {
        builder.ToTable("idn_admin_grant", tableBuilder =>
            tableBuilder.HasCheckConstraint(
                "ck_idn_admin_grant_revoke",
                "revoked_at IS NOT NULL OR revoked_by_user_id IS NULL"));

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

        builder.Property(x => x.GrantedAt)
            .HasColumnName("granted_at")
            .HasColumnType("datetime(3)")
            .HasConversion(new UtcDateTimeOffsetConverter())
            .HasDefaultValueSql("CURRENT_TIMESTAMP(3)")
            .IsRequired();

        builder.Property(x => x.GrantedByUserId)
            .HasColumnName("granted_by_user_id")
            .HasColumnType("binary(16)")
            .HasConversion(new NullableBigEndianGuidBytesConverter())
            .HasComment("NULL = seed");

        builder.Property(x => x.RevokedAt)
            .HasColumnName("revoked_at")
            .HasColumnType("datetime(3)")
            .HasConversion(new NullableUtcDateTimeOffsetConverter());

        builder.Property(x => x.RevokedByUserId)
            .HasColumnName("revoked_by_user_id")
            .HasColumnType("binary(16)")
            .HasConversion(new NullableBigEndianGuidBytesConverter());

        builder.Property<sbyte?>(ActiveMarkerPropertyName)
            .HasColumnName("active_marker")
            .HasColumnType("tinyint")
            .HasComputedColumnSql("CASE WHEN revoked_at IS NULL THEN 1 ELSE NULL END", stored: false);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .HasConstraintName("fk_idn_admin_grant_user")
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.GrantedByUserId)
            .HasConstraintName("fk_idn_admin_grant_granted_by")
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.RevokedByUserId)
            .HasConstraintName("fk_idn_admin_grant_revoked_by")
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(nameof(AdminGrant.UserId), ActiveMarkerPropertyName)
            .IsUnique()
            .HasDatabaseName("uk_idn_admin_grant_active");

        builder.HasIndex(ActiveMarkerPropertyName, nameof(AdminGrant.UserId))
            .HasDatabaseName("ix_idn_admin_grant_active");
    }
}

