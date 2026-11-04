namespace BrainMemo.Curriculum.Domain.Entities;

public enum AccessType { PUBLIC, PRIVATE, PROTECTED }
public enum BlockType { TEXT, MEDIA, QUIZ, FLASHCARD }
public enum BloomLevel { REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, CREATE }

public class Course
{
    public long CourseId { get; set; }
    public long CreatorId { get; set; } // Logical ID (identity.users)
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public long? ThumbnailMediaId { get; set; } // Logical ID (storage.media_files)
    public AccessType AccessType { get; set; } = AccessType.PUBLIC;
    public string? PasscodeHash { get; set; }
    public bool IsPublished { get; set; } = false;
    public DateTime? PublishedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CourseTag> CourseTags { get; set; } = new List<CourseTag>();
    public ICollection<CourseClo> CourseClos { get; set; } = new List<CourseClo>();
    public ICollection<Chapter> Chapters { get; set; } = new List<Chapter>();
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
}

public class Tag
{
    public long TagId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public ICollection<CourseTag> CourseTags { get; set; } = new List<CourseTag>();
}

public class CourseTag
{
    public long CourseId { get; set; }
    public long TagId { get; set; }
    public Course? Course { get; set; }
    public Tag? Tag { get; set; }
}

public class CourseClo
{
    public long CloId { get; set; }
    public long CourseId { get; set; }
    public string CloCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal TargetPercentage { get; set; } = 75.00m;
    public BloomLevel BloomLevel { get; set; }
    public Course? Course { get; set; }
}

public class Enrollment
{
    public long EnrollmentId { get; set; }
    public long CourseId { get; set; }
    public long StudentId { get; set; } // Logical ID
    public string Role { get; set; } = "STUDENT";
    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
    public Course? Course { get; set; }
}

public class Chapter
{
    public long ChapterId { get; set; }
    public long CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 1;
    public AccessType AccessType { get; set; } = AccessType.PUBLIC;
    public string? PasscodeHash { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Course? Course { get; set; }
    public ICollection<Page> Pages { get; set; } = new List<Page>();
}

public class Page
{
    public long PageId { get; set; }
    public long ChapterId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 1;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Chapter? Chapter { get; set; }
    public ICollection<Block> Blocks { get; set; } = new List<Block>();
    public ICollection<Discussion> Discussions { get; set; } = new List<Discussion>();
}

public class Block
{
    public long BlockId { get; set; }
    public long PageId { get; set; }
    public BlockType BlockType { get; set; }
    public int OrderIndex { get; set; } = 1;
    public Page? Page { get; set; }

    public TextBlock? TextBlock { get; set; }
    public MediaBlock? MediaBlock { get; set; }
}

public class TextBlock
{
    public long BlockId { get; set; }
    public string ContentMarkdown { get; set; } = string.Empty;
    public Block? Block { get; set; }
}

public class MediaBlock
{
    public long BlockId { get; set; }
    public long MediaFileId { get; set; } // Logical ID trỏ sang Storage
    public Block? Block { get; set; }
}

// Chuyển từ Assessment về đúng ranh giới Curriculum
public class UserCourseProgress
{
    public long ProgressId { get; set; }
    public long UserId { get; set; } // Logical ID
    public long CourseId { get; set; }
    public decimal ProgressPercentage { get; set; } = 0.00m;
    public int CompletedChaptersCount { get; set; } = 0;
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public Course? Course { get; set; }
}

public class Discussion
{
    public long DiscussionId { get; set; }
    public long PageId { get; set; }
    public long UserId { get; set; } // Logical ID
    public long? ParentId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Page? Page { get; set; }
}