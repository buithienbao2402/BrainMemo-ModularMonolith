using BrainMemo.Notification.Domain.Enums;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Notification.Domain.Entities;

public sealed class Announcement : Entity<Guid>
{
    public const int MaxTitleLength = 200;

    private Announcement(
        Guid id,
        string title,
        string body,
        Guid createdByUserId,
        DispatchStatus dispatchStatus,
        int? recipientCount,
        DateTimeOffset createdAt,
        DateTimeOffset? dispatchedAt)
        : base(id)
    {
        Title = title;
        Body = body;
        CreatedByUserId = createdByUserId;
        DispatchStatus = dispatchStatus;
        RecipientCount = recipientCount;
        CreatedAt = createdAt;
        DispatchedAt = dispatchedAt;
    }

    // Required by EF Core
    private Announcement() : base(Guid.Empty)
    {
        Title = string.Empty;
        Body = string.Empty;
    }

    public string Title { get; private set; }

    public string Body { get; private set; }

    public Guid CreatedByUserId { get; private set; }

    public DispatchStatus DispatchStatus { get; private set; }

    public int? RecipientCount { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset? DispatchedAt { get; private set; }

    public static Result<Announcement> Create(
        Guid id,
        string title,
        string body,
        Guid createdByUserId,
        DateTimeOffset utcNow)
    {
        if (id == Guid.Empty)
        {
            return Error.Validation("Id không hợp lệ.");
        }

        if (createdByUserId == Guid.Empty)
        {
            return Error.Validation("CreatedByUserId không hợp lệ.");
        }

        string trimmedTitle = title?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(trimmedTitle))
        {
            return Error.Validation("Tiêu đề không được để trống.");
        }

        if (trimmedTitle.Length > MaxTitleLength)
        {
            return Error.Validation($"Tiêu đề không được vượt quá {MaxTitleLength} ký tự.");
        }

        string trimmedBody = body?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(trimmedBody))
        {
            return Error.Validation("Nội dung không được để trống.");
        }

        return new Announcement(
            id,
            trimmedTitle,
            trimmedBody,
            createdByUserId,
            DispatchStatus.Pending,
            recipientCount: null,
            createdAt: utcNow,
            dispatchedAt: null);
    }

    public void MarkDispatched(int count, DateTimeOffset utcNow)
    {
        DispatchStatus = DispatchStatus.Completed;
        RecipientCount = count;
        DispatchedAt = utcNow;
    }
}
