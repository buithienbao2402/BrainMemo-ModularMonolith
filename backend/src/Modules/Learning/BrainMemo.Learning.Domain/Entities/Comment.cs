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
    public Guid UserId { get; private set; }
    public Guid? ParentCommentId { get; private set; }
    public string Content { get; private set; } = string.Empty;
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
        DateTimeOffset now)
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

        return new Comment
        {
            Id = id,
            CourseId = courseId,
            ChapterId = chapterId,
            UserId = userId,
            ParentCommentId = parentCommentId,
            Content = content.Trim(),
            IsPinned = false,
            PinnedAt = null,
            PinnedByUserId = null,
            EditedAt = null,
            DeletedAt = null,
            CreatedAt = now,
            UpdatedAt = now
        };
    }

    public Result Edit(Guid actorUserId, string newContent, DateTimeOffset now)
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

        Content = newContent.Trim();
        EditedAt = now;
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
