using BrainMemo.Content.Domain.Enums;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Domain.Entities;

public class Chapter : AggregateRoot
{
    private Chapter() { }

    public Chapter(
        Guid id,
        Guid courseId,
        string title,
        string? description,
        int position)
        : base(id)
    {
        if (id == Guid.Empty) throw new ArgumentException("Chapter id cannot be empty", nameof(id));
        if (courseId == Guid.Empty) throw new ArgumentException("Course id cannot be empty", nameof(courseId));
        if (string.IsNullOrWhiteSpace(title)) throw new ArgumentException("Chapter title cannot be empty", nameof(title));
        if (title.Length > 200) throw new ArgumentException("Chapter title cannot exceed 200 characters", nameof(title));
        if (description != null && description.Length > 1000) throw new ArgumentException("Description cannot exceed 1000 characters", nameof(description));

        CourseId = courseId;
        Title = title.Trim();
        Description = description?.Trim();
        Position = position;
        Status = ChapterStatus.Draft;
        LastVersionNo = 1;
        CreatedAt = DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public Guid CourseId { get; private set; }
    public int Position { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public ChapterStatus Status { get; private set; }
    public int LastVersionNo { get; private set; }
    public int? PublishedVersionNo { get; private set; }
    public DateTimeOffset? FirstPublishedAt { get; private set; }
    public DateTimeOffset? LastPublishedAt { get; private set; }
    public DateTimeOffset? DeletedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public static Result<Chapter> Create(
        Guid courseId,
        string title,
        string? description,
        int position)
    {
        if (courseId == Guid.Empty)
            return Result.Failure<Chapter>(new Error("COURSE_ID_REQUIRED", "Course id is required"));

        if (string.IsNullOrWhiteSpace(title))
            return Result.Failure<Chapter>(new Error("CHAPTER_TITLE_REQUIRED", "Chapter title is required"));

        if (title.Length > 200)
            return Result.Failure<Chapter>(new Error("CHAPTER_TITLE_TOO_LONG", "Chapter title cannot exceed 200 characters"));

        if (description != null && description.Length > 1000)
            return Result.Failure<Chapter>(new Error("CHAPTER_DESCRIPTION_TOO_LONG", "Description cannot exceed 1000 characters"));

        var chapter = new Chapter(
            Guid.NewGuid(),
            courseId,
            title,
            description,
            position);

        return Result.Success(chapter);
    }

    public Result UpdateDetails(string title, string? description)
    {
        if (string.IsNullOrWhiteSpace(title))
            return Result.Failure(new Error("CHAPTER_TITLE_REQUIRED", "Chapter title is required"));

        if (title.Length > 200)
            return Result.Failure(new Error("CHAPTER_TITLE_TOO_LONG", "Chapter title cannot exceed 200 characters"));

        if (description != null && description.Length > 1000)
            return Result.Failure(new Error("CHAPTER_DESCRIPTION_TOO_LONG", "Description cannot exceed 1000 characters"));

        Title = title.Trim();
        Description = description?.Trim();
        UpdatedAt = DateTimeOffset.UtcNow;
        return Result.Success();
    }

    public void Reorder(int newPosition)
    {
        Position = newPosition;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void IncrementVersion()
    {
        LastVersionNo++;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public Result Publish(int versionNo, DateTimeOffset publishedAt)
    {
        if (versionNo <= 0 || versionNo > LastVersionNo)
            return Result.Failure(new Error("INVALID_VERSION_NO", "Version number must be between 1 and last version"));

        Status = ChapterStatus.Published;
        PublishedVersionNo = versionNo;
        FirstPublishedAt ??= publishedAt;
        LastPublishedAt = publishedAt;
        UpdatedAt = publishedAt;
        return Result.Success();
    }

    public void SoftDelete()
    {
        DeletedAt = DateTimeOffset.UtcNow;
        UpdatedAt = DeletedAt.Value;
    }

    public void Restore()
    {
        DeletedAt = null;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public bool IsDeleted => DeletedAt.HasValue;
    public bool HasUnpublishedChanges => Status == ChapterStatus.Draft || (PublishedVersionNo.HasValue && PublishedVersionNo.Value < LastVersionNo);
}
