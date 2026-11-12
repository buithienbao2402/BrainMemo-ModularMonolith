using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.Identity.Infrastructure.Persistence.Converters;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Identity.Infrastructure.Persistence.Configurations;

internal sealed class ExternalIdentityConfiguration : IEntityTypeConfiguration<ExternalIdentity>
{
    public void Configure(EntityTypeBuilder<ExternalIdentity> builder)
    {
        builder.ToTable("idn_external_identity");

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

        builder.Property(x => x.Provider)
            .HasColumnName("provider")
            .HasColumnType("enum('GOOGLE')")
            .HasConversion(
                v => v.ToDatabaseValue(),
                v => ExternalProviderExtensions.ParseExternalProvider(v))
            .IsRequired();

        builder.Property(x => x.ProviderSubject)
            .HasColumnName("provider_subject")
            .HasColumnType($"varchar({ExternalIdentity.MaxProviderSubjectLength})")
            .HasMaxLength(ExternalIdentity.MaxProviderSubjectLength)
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("datetime(3)")
            .HasConversion(new UtcDateTimeOffsetConverter())
            .HasDefaultValueSql("CURRENT_TIMESTAMP(3)")
            .IsRequired();

        builder.HasIndex(x => new { x.Provider, x.ProviderSubject })
            .IsUnique()
            .HasDatabaseName("uk_idn_ext_provider_subject");

        builder.HasIndex(x => new { x.UserId, x.Provider })
            .IsUnique()
            .HasDatabaseName("uk_idn_ext_user_provider");
    }
}

