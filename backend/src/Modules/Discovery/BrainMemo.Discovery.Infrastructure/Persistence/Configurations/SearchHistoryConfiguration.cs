using BrainMemo.Discovery.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Discovery.Infrastructure.Persistence.Configurations;

public sealed class SearchHistoryConfiguration : IEntityTypeConfiguration<SearchHistory>
{
    public void Configure(EntityTypeBuilder<SearchHistory> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("dsc_search_history");

        builder.HasKey(h => h.Id);

        builder.Property(h => h.Id)
            .HasColumnName("id")
            .HasColumnType("binary(16)")
            .IsRequired();

        builder.Property(h => h.UserId)
            .HasColumnName("user_id")
            .HasColumnType("binary(16)")
            .IsRequired();

        builder.Property(h => h.QueryText)
            .HasColumnName("query_text")
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(h => h.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("datetime(3)")
            .IsRequired()
            .HasDefaultValueSql("CURRENT_TIMESTAMP(3)");

        builder.HasIndex(h => new { h.UserId, h.CreatedAt })
            .HasDatabaseName("ix_dsc_search_history_user");
    }
}
