namespace BrainMemo.Messaging.Application.DTOs;

public sealed record MessagingUserRefDto(Guid Id, string DisplayName, string? AvatarUrl);

public sealed record ConversationDto(
    Guid Id,
    Guid CourseId,
    string CourseName,
    MessagingUserRefDto Student,
    MessagingUserRefDto Instructor,
    DateTimeOffset LastMessageAt,
    string? LastMessagePreview,
    int UnreadCount,
    DateTimeOffset CreatedAt);

public sealed record MessageDto(
    Guid Id,
    Guid ConversationId,
    Guid SenderUserId,
    string Content,
    string? AttachmentUrl,
    DateTimeOffset? ReadAt,
    DateTimeOffset CreatedAt);

public sealed record SendMessageRequest(
    string Content,
    string? AttachmentUploadKey = null);

public sealed record UnreadMessagesCountDto(int UnreadCount);
