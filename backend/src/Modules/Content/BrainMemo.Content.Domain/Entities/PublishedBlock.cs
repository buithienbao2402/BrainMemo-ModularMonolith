using BrainMemo.Content.Domain.Enums;

namespace BrainMemo.Content.Domain.Entities;

public class PublishedBlock
{
    private PublishedBlock() { }

    public PublishedBlock(
        Guid blockId,
        Guid chapterId,
        BlockType blockType,
        int position,
        Guid? resourceId,
        Guid? questionId,
        int versionNo)
    {
        BlockId = blockId;
        ChapterId = chapterId;
        BlockType = blockType;
        Position = position;
        ResourceId = resourceId;
        QuestionId = questionId;
        VersionNo = versionNo;
    }

    public Guid BlockId { get; private set; }
    public Guid ChapterId { get; private set; }
    public BlockType BlockType { get; private set; }
    public int Position { get; private set; }
    public Guid? ResourceId { get; private set; }
    public Guid? QuestionId { get; private set; }
    public int VersionNo { get; private set; }
}
