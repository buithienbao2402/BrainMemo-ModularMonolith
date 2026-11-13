using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Course.Domain.Entities;

public sealed class Course : AggregateRoot
{
    private readonly List<CourseTag> _tags = [];

    private Course()
    {
    }

    public Course(
        Guid id,
        Guid ownerUserId,
        string name,
        string? description,
        string? coverStorageKey,
        CourseAccessMode accessMode,
        CourseStatus status,
        IEnumerable<string>? tags,
        DateTimeOffset createdAt)
        : base(id)
    {
        OwnerUserId = ownerUserId;
        Name = ValidateName(name);
        Description = description;
        CoverStorageKey = coverStorageKey;
        AccessMode = accessMode;
        Status = status;
        Revision = 1;
        CreatedAt = createdAt;
        UpdatedAt = createdAt;

        if (tags != null)
        {
            SetTags(tags);
        }
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
    public uint Revision { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public IReadOnlyCollection<CourseTag> Tags => _tags.AsReadOnly();

    public bool IsHidden => HiddenAt.HasValue;
    public bool IsDeleted => DeletedAt.HasValue;

    public bool IsEligible() => !IsDeleted && !IsHidden && AccessMode == CourseAccessMode.Public;

    public static Result<Course> Create(
        Guid id,
        Guid ownerUserId,
        string name,
        string? description,
        string? coverStorageKey,
        CourseAccessMode accessMode,
        CourseStatus status,
        IEnumerable<string>? tags,
        DateTimeOffset createdAt)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return Result.Failure<Course>(new Error("COURSE_NAME_REQUIRED", "Course name is required."));
        }

        if (name.Trim().Length > 200)
        {
            return Result.Failure<Course>(new Error("COURSE_NAME_TOO_LONG", "Course name cannot exceed 200 characters."));
        }

        List<string> tagList = tags?.ToList() ?? [];
        if (tagList.Count > 10)
        {
            return Result.Failure<Course>(new Error("COURSE_TOO_MANY_TAGS", "A course cannot have more than 10 tags."));
        }

        foreach (string t in tagList)
        {
            if (t.Length > 50)
            {
                return Result.Failure<Course>(new Error("COURSE_TAG_TOO_LONG", "Tag cannot exceed 50 characters."));
            }
        }

        Course course = new(id, ownerUserId, name.Trim(), description, coverStorageKey, accessMode, status, tagList, createdAt);
        return Result.Success(course);
    }

    public Result Update(
        string name,
        string? description,
        CourseAccessMode accessMode,
        CourseStatus status,
        IEnumerable<string>? tags,
        DateTimeOffset now)
    {
        if (IsDeleted)
        {
            return Result.Failure(Error.Conflict("COURSE_DELETED", "Cannot update a deleted course."));
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            return Result.Failure(new Error("COURSE_NAME_REQUIRED", "Course name is required."));
        }

        if (name.Trim().Length > 200)
        {
            return Result.Failure(new Error("COURSE_NAME_TOO_LONG", "Course name cannot exceed 200 characters."));
        }

        // FR-CRS-03,05,06: Đổi sang ONLY_ME khi đang Tạm ẩn → ONLY_ME_NOT_ALLOWED
        if (IsHidden && accessMode == CourseAccessMode.OnlyMe)
        {
            return Result.Failure(new Error("ONLY_ME_NOT_ALLOWED", "Cannot set access mode to ONLY_ME while course is hidden."));
        }

        List<string> tagList = tags?.ToList() ?? [];
        if (tagList.Count > 10)
        {
            return Result.Failure(new Error("COURSE_TOO_MANY_TAGS", "A course cannot have more than 10 tags."));
        }

        foreach (string t in tagList)
        {
            if (t.Length > 50)
            {
                return Result.Failure(new Error("COURSE_TAG_TOO_LONG", "Tag cannot exceed 50 characters."));
            }
        }

        Name = name.Trim();
        Description = description;
        AccessMode = accessMode;
        Status = status;
        UpdatedAt = now;
        Revision++;

        SetTags(tagList);
        return Result.Success();
    }

    public void UpdateCover(string? coverStorageKey, DateTimeOffset now)
    {
        CoverStorageKey = coverStorageKey;
        UpdatedAt = now;
    }

    public Result SoftDelete(DateTimeOffset now)
    {
        if (IsDeleted)
        {
            return Result.Success(); // Idempotent
        }

        DeletedAt = now;
        UpdatedAt = now;
        Revision++;
        return Result.Success();
    }

    public Result Hide(Guid sanctionId, DateTimeOffset now)
    {
        if (AccessMode == CourseAccessMode.OnlyMe)
        {
            return Result.Failure(new Error("ONLY_ME_NOT_ALLOWED", "Cannot hide an ONLY_ME course."));
        }

        if (IsHidden)
        {
            return Result.Failure(Error.Conflict("ALREADY_HIDDEN", "Course is already hidden."));
        }

        if (IsDeleted)
        {
            return Result.Failure(Error.Conflict("INVALID_STATE", "Cannot hide a deleted course."));
        }

        HiddenAt = now;
        HiddenSanctionId = sanctionId;
        UpdatedAt = now;
        Revision++;
        return Result.Success();
    }

    public Result Restore(Guid sanctionId, DateTimeOffset now)
    {
        if (!IsHidden)
        {
            return Result.Success(); // Idempotent
        }

        if (HiddenSanctionId != sanctionId)
        {
            return Result.Failure(Error.Conflict("SANCTION_MISMATCH", "Cannot restore course with non-matching sanction ID."));
        }

        HiddenAt = null;
        HiddenSanctionId = null;
        UpdatedAt = now;
        Revision++;
        return Result.Success();
    }

    private void SetTags(IEnumerable<string> tags)
    {
        _tags.Clear();
        HashSet<string> uniqueTags = [];
        foreach (string tag in tags)
        {
            string trimmed = tag.Trim().ToLowerInvariant();
            if (!string.IsNullOrWhiteSpace(trimmed) && uniqueTags.Add(trimmed))
            {
                _tags.Add(new CourseTag(Id, trimmed));
            }
        }
    }

    private static string ValidateName(string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        string trimmed = name.Trim();
        if (trimmed.Length > 200)
        {
            throw new ArgumentException("Course name cannot exceed 200 characters.", nameof(name));
        }

        return trimmed;
    }
}
