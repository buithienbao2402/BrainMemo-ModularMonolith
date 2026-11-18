using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Learning.Domain.Entities;

public class AssignmentSubmission : AggregateRoot
{
    private AssignmentSubmission() { }

    public AssignmentSubmission(
        Guid id,
        Guid userId,
        Guid courseId,
        Guid assignmentBlockId,
        string? textContent = null,
        string? filesJson = null)
        : base(id)
    {
        UserId = userId;
        CourseId = courseId;
        AssignmentBlockId = assignmentBlockId;
        Status = "DRAFT";
        TextContent = textContent;
        FilesJson = filesJson;
        CreatedAt = DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public Guid UserId { get; private set; }
    public Guid CourseId { get; private set; }
    public Guid AssignmentBlockId { get; private set; }
    public string Status { get; private set; } = "DRAFT";
    public string? TextContent { get; private set; }
    public string? FilesJson { get; private set; }
    public bool? IsLate { get; private set; }
    public DateTimeOffset? SubmittedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void SaveDraft(string? textContent, string? filesJson)
    {
        if (Status != "DRAFT")
        {
            throw new InvalidOperationException("Không thể sửa bài nộp đã được gửi hoặc chấm điểm.");
        }

        TextContent = textContent;
        FilesJson = filesJson;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Submit(bool isLate, DateTimeOffset submittedAt)
    {
        if (Status != "DRAFT")
        {
            throw new InvalidOperationException("Bài tập đã được nộp trước đó.");
        }

        Status = "SUBMITTED";
        IsLate = isLate;
        SubmittedAt = submittedAt;
        UpdatedAt = submittedAt;
    }

    public void MarkGraded(DateTimeOffset gradedAt)
    {
        Status = "GRADED";
        UpdatedAt = gradedAt;
    }
}
