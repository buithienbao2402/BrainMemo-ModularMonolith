using BrainMemo.Messaging.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BrainMemo.Messaging.Infrastructure.Persistence.Configurations;

public sealed class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> builder)
    {
        builder.ToTable("msg_message");

        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(m => m.ConversationId).HasColumnName("conversation_id").IsRequired();
        builder.Property(m => m.SenderUserId).HasColumnName("sender_user_id").IsRequired();
        builder.Property(m => m.Content).HasColumnName("content").HasColumnType("text").IsRequired();
        builder.Property(m => m.AttachmentStorageKey).HasColumnName("attachment_storage_key").HasMaxLength(500);
        builder.Property(m => m.ReadAt).HasColumnName("read_at").HasPrecision(3);
        builder.Property(m => m.CreatedAt).HasColumnName("created_at").HasPrecision(3).IsRequired();

        builder.HasIndex(m => new { m.ConversationId, m.CreatedAt })
            .HasDatabaseName("ix_msg_message_conv_time");
    }
}
