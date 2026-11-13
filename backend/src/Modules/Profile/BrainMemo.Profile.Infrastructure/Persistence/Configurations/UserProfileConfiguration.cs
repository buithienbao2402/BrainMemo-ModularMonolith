using BrainMemo.Profile.Domain.Entities;
using BrainMemo.Profile.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Profile.Infrastructure.Persistence.Configurations;

public sealed class UserProfileConfiguration : IEntityTypeConfiguration<UserProfile>
{
    public void Configure(EntityTypeBuilder<UserProfile> builder)
    {
        builder.ToTable("prf_user_profile");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Id)
            .HasColumnName("user_id")
            .HasColumnType("binary(16)")
            .ValueGeneratedNever();

        builder.Property(p => p.DisplayName)
            .HasColumnName("display_name")
            .HasMaxLength(UserProfile.MaxDisplayNameLength)
            .IsRequired();

        builder.Property(p => p.AvatarStorageKey)
            .HasColumnName("avatar_storage_key")
            .HasMaxLength(UserProfile.MaxAvatarStorageKeyLength)
            .IsRequired(false);

        builder.Property(p => p.Bio)
            .HasColumnName("bio")
            .HasMaxLength(UserProfile.MaxBioLength)
            .IsRequired(false);

        builder.Property(p => p.ShowCourseList)
            .HasColumnName("show_course_list")
            .HasDefaultValue(true)
            .IsRequired();

        builder.Property(p => p.UiTheme)
            .HasColumnName("ui_theme")
            .HasConversion<string>()
            .HasMaxLength(10)
            .HasDefaultValue(UiTheme.Light)
            .IsRequired();

        builder.Property(p => p.CreatedAt)
            .HasColumnName("created_at")
            .HasPrecision(3)
            .IsRequired();

        builder.Property(p => p.UpdatedAt)
            .HasColumnName("updated_at")
            .HasPrecision(3)
            .IsRequired();
    }
}
