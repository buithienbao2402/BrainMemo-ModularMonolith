using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Messaging.Domain.Entities;

public sealed class Message : Entity
{
    private Message()
    {
    }

    private Message(
        Guid id,
        Guid conversationId,
        Guid senderUserId,
        string content,
        string? attachmentStorageKey,
        DateTimeOffset createdAt) : base(id)
    {
        ConversationId = conversationId;
        SenderUserId = senderUserId;
        Content = content;
        AttachmentStorageKey = attachmentStorageKey;
        CreatedAt = createdAt;
    }

    public Guid ConversationId { get; private set; }
    public Guid SenderUserId { get; private set; }
    public string Content { get; private set; } = string.Empty;
    public string? AttachmentStorageKey { get; private set; }
    public DateTimeOffset? ReadAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public static Result<Message> Create(
        Guid id,
        Guid conversationId,
        Guid senderUserId,
        string content,
        string? attachmentStorageKey,
        DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return Result.Failure<Message>(Error.Validation("Nội dung tin nhắn không được để trống."));
        }

        string trimmed = content.Trim();
        if (trimmed.Length > 5000)
        {
            return Result.Failure<Message>(Error.Validation("Nội dung tin nhắn không được vượt quá 5000 ký tự."));
        }

        return Result.Success(new Message(id, conversationId, senderUserId, trimmed, attachmentStorageKey, now));
    }

    public void MarkRead(DateTimeOffset now)
    {
        ReadAt ??= now;
    }
}
