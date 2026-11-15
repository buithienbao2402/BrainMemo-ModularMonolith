using BrainMemo.Learning.Domain.Enums;
using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Learning.Domain.Entities;

public sealed class BlockCompletion : Entity
{
    private BlockCompletion()
    {
    }

    public BlockCompletion(
        Guid id,
        Guid userId,
        Guid courseId,
        Guid chapterId,
        Guid blockId,
        LearningBlockType blockType,
        DateTimeOffset completedAt)
        : base(id)
    {
        UserId = userId;
        CourseId = courseId;
        ChapterId = chapterId;
        BlockId = blockId;
        BlockType = blockType;
        CompletedAt = completedAt;
    }

    public Guid UserId { get; private set; }
    public Guid CourseId { get; private set; }
    public Guid ChapterId { get; private set; }
    public Guid BlockId { get; private set; }
    public LearningBlockType BlockType { get; private set; }
    public DateTimeOffset CompletedAt { get; private set; }
}
