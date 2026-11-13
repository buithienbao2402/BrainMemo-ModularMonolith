using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Course.Domain.Entities;

public sealed class Course : AggregateRoot<Guid>
{
    public const int MaxNameLength = 200;
    public const int MaxTagsCount = 10;
    public const int MaxTagLength = 50;

    private readonly List<CourseTag> _tags = [];

    private Course() { }

    private Course(
        Guid id,
        Guid ownerUserId,
        string name,
        string? description,
        string? coverStorageKey,
        CourseAccessMode accessMode,
        CourseStatus status,
        DateTimeOffset createdAt) : base(id)
    {
        OwnerUserId = ownerUserId;
        Name = name;
        Description = description;
        CoverStorageKey = coverStorageKey;
        AccessMode = accessMode;
        Status = status;
        Revision = 1;
        CreatedAt = createdAt;
        UpdatedAt = createdAt;
    }

    public Guid OwnerUserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string? CoverStorageKey { get; private set; }
    public CourseAccessMode AccessMode { get; private set; }
    public CourseStatus Status { get; private set; }
    public DateTimeOffset? HiddenAt { get; private set; }
    public Guid? HiddenSanctionId { get; private set; }
    public DateTimeOffset? DeletedAt { get; private set; }
    public int Revision { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public IReadOnlyCollection<CourseTag> Tags => _tags.AsReadOnly();

    public bool IsHidden => HiddenAt.HasValue;
    public bool IsDeleted => DeletedAt.HasValue;

    public bool IsEligible() =>
        (AccessMode == CourseAccessMode.Public || AccessMode == CourseAccessMode.Private)
        && HiddenAt == null
        && DeletedAt == null;

    public static Result<Course> Create(
        Guid id,
        Guid ownerUserId,
        string name,
        string? description,
        string? coverStorageKey,
        CourseAccessMode accessMode,
        CourseStatus status,
        IEnumerable<string>? tags,
        DateTimeOffset utcNow)
    {
        if (id == Guid.Empty)
        {
            return Error.Validation("ID khóa học không hợp lệ.");
        }

        if (ownerUserId == Guid.Empty)
        {
            return Error.Validation("ID chủ khóa không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            return Error.Validation("Tên khóa học không được để trống.", [new("name", "Tên khóa học là bắt buộc.")]);
        }

        string trimmedName = name.Trim();
        if (trimmedName.Length > MaxNameLength)
        {
            return Error.Validation(
                $"Tên khóa học không được vượt quá {MaxNameLength} ký tự.",
                [new("name", $"Tên khóa học không được vượt quá {MaxNameLength} ký tự.")]);
        }

        Course course = new(
            id,
            ownerUserId,
            trimmedName,
            string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            string.IsNullOrWhiteSpace(coverStorageKey) ? null : coverStorageKey.Trim(),
            accessMode,
            status,
            utcNow);

        if (tags is not null)
        {
            Result tagResult = course.SetTags(tags);
            if (tagResult.IsFailure)
            {
                return tagResult.Error;
            }
        }

        return course;
    }

    public Result Update(
        string name,
        string? description,
        CourseAccessMode accessMode,
        CourseStatus status,
        IEnumerable<string>? tags,
        DateTimeOffset utcNow)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return Error.Validation("Tên khóa học không được để trống.", [new("name", "Tên khóa học là bắt buộc.")]);
        }

        string trimmedName = name.Trim();
        if (trimmedName.Length > MaxNameLength)
        {
            return Error.Validation(
                $"Tên khóa học không được vượt quá {MaxNameLength} ký tự.",
                [new("name", $"Tên khóa học không được vượt quá {MaxNameLength} ký tự.")]);
        }

        if (accessMode == CourseAccessMode.OnlyMe && HiddenAt.HasValue)
        {
            return new Error("ONLY_ME_NOT_ALLOWED", "Không thể chuyển khóa học đang tạm ẩn sang chế độ Chỉ mình tôi.");
        }

        Name = trimmedName;
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        AccessMode = accessMode;
        Status = status;
        UpdatedAt = utcNow;
        Revision++;

        if (tags is not null)
        {
            Result tagResult = SetTags(tags);
            if (tagResult.IsFailure)
            {
                return tagResult.Error;
            }
        }

        return Result.Success();
    }

    public void UpdateCover(string? coverStorageKey, DateTimeOffset utcNow)
    {
        CoverStorageKey = string.IsNullOrWhiteSpace(coverStorageKey) ? null : coverStorageKey.Trim();
        UpdatedAt = utcNow;
        Revision++;
    }

    public Result SetTags(IEnumerable<string> tags)
    {
        ArgumentNullException.ThrowIfNull(tags);

        List<string> normalized = tags
            .Where(static t => !string.IsNullOrWhiteSpace(t))
            .Select(static t => t.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (normalized.Count > MaxTagsCount)
        {
            return Error.Validation(
                $"Khóa học chỉ được gắn tối đa {MaxTagsCount} thẻ (tags).",
                [new("tags", $"Số lượng thẻ vượt quá {MaxTagsCount}.")]);
        }

        foreach (string tag in normalized)
        {
            if (tag.Length > MaxTagLength)
            {
                return Error.Validation(
                    $"Thẻ '{tag}' vượt quá {MaxTagLength} ký tự cho phép.",
                    [new("tags", $"Độ dài thẻ tối đa là {MaxTagLength} ký tự.")]);
            }
        }

        _tags.Clear();
        foreach (string tag in normalized)
        {
            _tags.Add(new CourseTag(Id, tag));
        }

        return Result.Success();
    }

    public Result SoftDelete(DateTimeOffset utcNow)
    {
        if (DeletedAt.HasValue)
        {
            return Result.Success(); // Idempotent
        }

        DeletedAt = utcNow;
        Revision++;
        return Result.Success();
    }

    public Result Hide(Guid sanctionId, DateTimeOffset utcNow)
    {
        if (AccessMode == CourseAccessMode.OnlyMe)
        {
            return new Error("ONLY_ME_NOT_ALLOWED", "Không thể tạm ẩn khóa học ở chế độ Chỉ mình tôi.");
        }

        if (HiddenAt.HasValue)
        {
            return new Error("ALREADY_HIDDEN", "Khóa học đã ở trạng thái tạm ẩn.");
        }

        HiddenAt = utcNow;
        HiddenSanctionId = sanctionId;
        Revision++;
        return Result.Success();
    }

    public Result Restore(Guid sanctionId)
    {
        if (!HiddenAt.HasValue)
        {
            return Result.Success(); // Idempotent
        }

        if (HiddenSanctionId != sanctionId)
        {
            return Result.Success(); // Idempotent - chỉ gỡ khi hidden_sanction_id khớp
        }

        HiddenAt = null;
        HiddenSanctionId = null;
        Revision++;
        return Result.Success();
    }
}
