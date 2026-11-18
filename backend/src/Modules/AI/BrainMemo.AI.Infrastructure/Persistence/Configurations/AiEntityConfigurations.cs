using BrainMemo.AI.Domain.Entities;
using BrainMemo.AI.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.AI.Infrastructure.Persistence.Configurations;

public sealed class AiGenerationJobConfiguration : IEntityTypeConfiguration<AiGenerationJob>
{
    public void Configure(EntityTypeBuilder<AiGenerationJob> builder)
    {
        builder.ToTable("ai_generation_job");

        builder.HasKey(j => j.Id);
        builder.Property(j => j.Id).HasColumnName("id");

        builder.Property(j => j.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(j => j.CourseId).HasColumnName("course_id").IsRequired();

        builder.Property(j => j.JobType)
            .HasColumnName("job_type")
            .HasConversion(
                v => v.ToString().ToUpperInvariant(),
                v => Enum.Parse<AiJobType>(v, true))
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(j => j.SourceKind)
            .HasColumnName("source_kind")
            .HasConversion(
                v => v == AiSourceKind.PastedText ? "PASTED_TEXT" : "CHAPTER",
                v => v == "CHAPTER" ? AiSourceKind.Chapter : AiSourceKind.PastedText)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(j => j.SourceText).HasColumnName("source_text").HasColumnType("mediumtext");
        builder.Property(j => j.SourceChapterId).HasColumnName("source_chapter_id");
        builder.Property(j => j.GenerationParams).HasColumnName("generation_params").HasColumnType("json").IsRequired();

        builder.Property(j => j.Status)
            .HasColumnName("status")
            .HasConversion(
                v => v.ToString().ToUpperInvariant(),
                v => Enum.Parse<AiJobStatus>(v, true))
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(j => j.ResultCount).HasColumnName("result_count");
        builder.Property(j => j.ErrorMessage).HasColumnName("error_message").HasMaxLength(500);
        builder.Property(j => j.StartedAt).HasColumnName("started_at");
        builder.Property(j => j.CompletedAt).HasColumnName("completed_at");
        builder.Property(j => j.CreatedAt).HasColumnName("created_at").IsRequired();

        builder.HasIndex(j => new { j.UserId, j.CreatedAt }).HasDatabaseName("ix_ai_job_user");
        builder.HasIndex(j => new { j.Status, j.CreatedAt }).HasDatabaseName("ix_ai_job_status");
    }
}

public sealed class AiUserDailyQuotaConfiguration : IEntityTypeConfiguration<AiUserDailyQuota>
{
    public void Configure(EntityTypeBuilder<AiUserDailyQuota> builder)
    {
        builder.ToTable("ai_user_daily_quota");

        builder.HasKey(q => q.Id);
        builder.Property(q => q.Id).HasColumnName("id");

        builder.Property(q => q.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(q => q.QuotaDate).HasColumnName("quota_date").HasColumnType("date").IsRequired();
        builder.Property(q => q.UsedCount).HasColumnName("used_count").IsRequired();
        builder.Property(q => q.QuotaLimit).HasColumnName("quota_limit").IsRequired();
        builder.Property(q => q.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(q => q.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.HasIndex(q => new { q.UserId, q.QuotaDate }).IsUnique().HasDatabaseName("uk_ai_quota_user_date");
    }
}

public sealed class SystemSettingConfiguration : IEntityTypeConfiguration<SystemSetting>
{
    public void Configure(EntityTypeBuilder<SystemSetting> builder)
    {
        builder.ToTable("sys_setting");

        builder.HasKey(s => s.Key);
        builder.Property(s => s.Key).HasColumnName("key").HasMaxLength(100);

        builder.Property(s => s.Value).HasColumnName("value").HasColumnType("json").IsRequired();
        builder.Property(s => s.UpdatedBy).HasColumnName("updated_by");
        builder.Property(s => s.UpdatedAt).HasColumnName("updated_at").IsRequired();
    }
}
