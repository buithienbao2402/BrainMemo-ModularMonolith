using BrainMemo.Messaging.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Messaging.Infrastructure.Persistence.Configurations;

public sealed class ConversationConfiguration : IEntityTypeConfiguration<Conversation>
{
    public void Configure(EntityTypeBuilder<Conversation> builder)
    {
        builder.ToTable("msg_conversation");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(c => c.CourseId).HasColumnName("course_id").IsRequired();
        builder.Property(c => c.StudentUserId).HasColumnName("student_user_id").IsRequired();
        builder.Property(c => c.InstructorUserId).HasColumnName("instructor_user_id").IsRequired();
        builder.Property(c => c.LastMessageAt).HasColumnName("last_message_at").HasPrecision(3).IsRequired();
        builder.Property(c => c.LastMessagePreview).HasColumnName("last_message_preview").HasMaxLength(255);
        builder.Property(c => c.CreatedAt).HasColumnName("created_at").HasPrecision(3).IsRequired();
        builder.Property(c => c.UpdatedAt).HasColumnName("updated_at").HasPrecision(3).IsRequired();

        builder.HasIndex(c => new { c.CourseId, c.StudentUserId, c.InstructorUserId })
            .HasDatabaseName("uk_msg_conv_course_student_instructor")
            .IsUnique();

        builder.HasMany(c => c.Messages)
            .WithOne()
            .HasForeignKey(m => m.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
