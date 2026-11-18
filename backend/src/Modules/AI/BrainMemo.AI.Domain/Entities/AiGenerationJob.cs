using BrainMemo.AI.Domain.Enums;
using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.AI.Domain.Entities;

public sealed class AiGenerationJob : AggregateRoot
{
    private AiGenerationJob() { }

    public AiGenerationJob(
        Guid id,
        Guid userId,
        Guid courseId,
        AiJobType jobType,
        AiSourceKind sourceKind,
        string? sourceText,
        Guid? sourceChapterId,
        string generationParams,
        AiJobStatus status = AiJobStatus.Pending)
        : base(id)
    {
        UserId = userId;
        CourseId = courseId;
        JobType = jobType;
        SourceKind = sourceKind;
        SourceText = sourceText;
        SourceChapterId = sourceChapterId;
        GenerationParams = generationParams;
        Status = status;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public Guid UserId { get; private set; }
    public Guid CourseId { get; private set; }
    public AiJobType JobType { get; private set; }
    public AiSourceKind SourceKind { get; private set; }
    public string? SourceText { get; private set; }
    public Guid? SourceChapterId { get; private set; }
    public string GenerationParams { get; private set; } = "{}";
    public AiJobStatus Status { get; private set; }
    public int? ResultCount { get; private set; }
    public string? ErrorMessage { get; private set; }
    public DateTimeOffset? StartedAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public void MarkRunning()
    {
        Status = AiJobStatus.Running;
        StartedAt = DateTimeOffset.UtcNow;
    }

    public void MarkCompleted(int resultCount)
    {
        Status = AiJobStatus.Completed;
        ResultCount = resultCount;
        CompletedAt = DateTimeOffset.UtcNow;
    }

    public void MarkFailed(string errorMessage)
    {
        Status = AiJobStatus.Failed;
        ErrorMessage = errorMessage.Length > 500 ? errorMessage[..500] : errorMessage;
        CompletedAt = DateTimeOffset.UtcNow;
    }
}
