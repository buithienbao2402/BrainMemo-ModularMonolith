using BrainMemo.Content.Domain.Enums;
using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Content.Domain.Entities;

public class Block : Entity
{
    private Block() { }

    public Block(
        Guid id,
        Guid chapterId,
        BlockType blockType,
        int position,
        string? title = null,
        string? body = null,
        Guid? resourceId = null,
        Guid? questionId = null,
        string? flashcards = null,
        Guid? aiJobId = null,
        AiReviewStatus aiReviewStatus = AiReviewStatus.NotApplicable)
        : base(id)
    {
        ChapterId = chapterId;
        BlockType = blockType;
        Position = position;
        Title = title?.Trim();
        Body = body;
        ResourceId = resourceId;
        QuestionId = questionId;
        Flashcards = flashcards;
        AiJobId = aiJobId;
        AiReviewStatus = aiReviewStatus;
        CreatedAt = DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public Guid ChapterId { get; private set; }
    public BlockType BlockType { get; private set; }
    public int Position { get; private set; }
    public string? Title { get; private set; }
    public string? Body { get; private set; }
    public Guid? ResourceId { get; private set; }
    public Guid? QuestionId { get; private set; }
    public string? Flashcards { get; private set; }
    public Guid? AiJobId { get; private set; }
    public AiReviewStatus AiReviewStatus { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void Update(
        int position,
        string? title,
        string? body,
        Guid? resourceId,
        Guid? questionId,
        string? flashcards,
        AiReviewStatus aiReviewStatus)
    {
        Position = position;
        Title = title?.Trim();
        Body = body;
        ResourceId = resourceId;
        QuestionId = questionId;
        Flashcards = flashcards;
        AiReviewStatus = aiReviewStatus;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
