using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Domain.Entities;

public sealed class Comment : Entity<Guid>
{
    private Comment() : base(Guid.Empty)
    {
    }

    public Guid CourseId { get; private set; }
    public Guid? ChapterId { get; private set; }
    public Guid? BlockId { get; private set; }
    public Guid UserId { get; private set; }
    public Guid? ParentCommentId { get; private set; }
    public string? Title { get; private set; }
    public string Content { get; private set; } = string.Empty;
    public bool IsResolved { get; private set; }
    public DateTimeOffset? ResolvedAt { get; private set; }
    public Guid? ResolvedByUserId { get; private set; }
    public Guid? ResolvedCommentId { get; private set; }
    public bool IsPinned { get; private set; }
    public DateTimeOffset? PinnedAt { get; private set; }
    public Guid? PinnedByUserId { get; private set; }
    public DateTimeOffset? EditedAt { get; private set; }
    public DateTimeOffset? DeletedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    // Navigation properties for EF Core self-referencing relationship
    public Comment? ParentComment { get; private set; }
    public ICollection<Comment> Replies { get; private set; } = new List<Comment>();

    public bool IsDeleted => DeletedAt.HasValue;

    public static Result<Comment> Create(
        Guid id,
        Guid courseId,
        Guid? chapterId,
        Guid userId,
        Guid? parentCommentId,
        string content,
        DateTimeOffset now,
        string? title = null,
        Guid? blockId = null)
    {
        if (id == Guid.Empty)
        {
            return Error.Validation("Id không hợp lệ.");
        }

        if (courseId == Guid.Empty)
        {
            return Error.Validation("CourseId không hợp lệ.");
        }

        if (userId == Guid.Empty)
        {
            return Error.Validation("UserId không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(content))
        {
            return Error.Validation("Nội dung bình luận không được để trống.");
        }

        string? normalizedTitle = string.IsNullOrWhiteSpace(title) ? null : title.Trim();
        if (normalizedTitle is { Length: > 255 })
        {
            return Error.Validation("Tiêu đề câu hỏi không được vượt quá 255 ký tự.");
        }

        return new Comment
        {
            Id = id,
            CourseId = courseId,
            ChapterId = chapterId,
            BlockId = blockId,
            UserId = userId,
            ParentCommentId = parentCommentId,
            Title = parentCommentId.HasValue ? null : normalizedTitle,
            Content = content.Trim(),
            IsResolved = false,
            IsPinned = false,
            PinnedAt = null,
            PinnedByUserId = null,
            EditedAt = null,
            DeletedAt = null,
            CreatedAt = now,
            UpdatedAt = now
        };
    }

    public Result Edit(Guid actorUserId, string newContent, DateTimeOffset now, string? newTitle = null)
    {
        if (DeletedAt.HasValue)
        {
            return Error.Validation("Không thể chỉnh sửa bình luận đã xóa.");
        }

        if (UserId != actorUserId)
        {
            return Error.Forbidden("Chỉ tác giả mới được chỉnh sửa bình luận.");
        }

        if (string.IsNullOrWhiteSpace(newContent))
        {
            return Error.Validation("Nội dung bình luận không được để trống.");
        }

        if (!ParentCommentId.HasValue && newTitle != null)
        {
            string trimmedTitle = newTitle.Trim();
            if (trimmedTitle.Length > 255)
            {
                return Error.Validation("Tiêu đề câu hỏi không được vượt quá 255 ký tự.");
            }
            Title = string.IsNullOrWhiteSpace(trimmedTitle) ? null : trimmedTitle;
        }

        Content = newContent.Trim();
        EditedAt = now;
        UpdatedAt = now;
        return Result.Success();
    }

    public Result Resolve(Guid actorUserId, Guid? resolvedCommentId, DateTimeOffset now)
    {
        if (DeletedAt.HasValue)
        {
            return Error.Validation("Không thể đánh dấu đã giải đáp cho câu hỏi đã xóa.");
        }

        if (ParentCommentId.HasValue)
        {
            return Error.Validation("Chỉ có thể đánh dấu đã giải đáp cho câu hỏi gốc.");
        }

        IsResolved = true;
        ResolvedAt = now;
        ResolvedByUserId = actorUserId;
        ResolvedCommentId = resolvedCommentId;
        UpdatedAt = now;
        return Result.Success();
    }

    public Result Unresolve(DateTimeOffset now)
    {
        if (DeletedAt.HasValue)
        {
            return Error.Validation("Không thể cập nhật câu hỏi đã xóa.");
        }

        IsResolved = false;
        ResolvedAt = null;
        ResolvedByUserId = null;
        ResolvedCommentId = null;
        UpdatedAt = now;
        return Result.Success();
    }

    public Result SoftDelete(Guid actorUserId, DateTimeOffset now)
    {
        if (DeletedAt.HasValue)
        {
            return Result.Success(); // Idempotent
        }

        if (UserId != actorUserId)
        {
            return Error.Forbidden("Chỉ tác giả mới được xóa bình luận.");
        }

        DeletedAt = now;
        UpdatedAt = now;
        return Result.Success();
    }

    public Result Pin(Guid actorUserId, DateTimeOffset now)
    {
        if (DeletedAt.HasValue)
        {
            return Error.Validation("Không thể ghim bình luận đã xóa.");
        }

        IsPinned = true;
        PinnedAt = now;
        PinnedByUserId = actorUserId;
        UpdatedAt = now;
        return Result.Success();
    }

    public Result Unpin(DateTimeOffset now)
    {
        IsPinned = false;
        PinnedAt = null;
        PinnedByUserId = null;
        UpdatedAt = now;
        return Result.Success();
    }

    public Result AdminSoftDelete(Guid actorAdminId, DateTimeOffset now)
    {
        if (DeletedAt.HasValue)
        {
            return Result.Success();
        }

        DeletedAt = now;
        UpdatedAt = now;
        return Result.Success();
    }

    public Result AdminRestore(Guid actorAdminId, DateTimeOffset now)
    {
        DeletedAt = null;
        UpdatedAt = now;
        return Result.Success();
    }
}
