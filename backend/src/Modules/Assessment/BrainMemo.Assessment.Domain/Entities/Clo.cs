using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Assessment.Domain.Entities;

public class Clo : AggregateRoot
{
    private Clo() { }

    public Clo(
        Guid id,
        Guid courseId,
        string code,
        string description,
        string? bloomLevelCode = null,
        List<Guid>? linkedPloIds = null)
        : base(id)
    {
        CourseId = courseId;
        Code = code;
        Description = description;
        BloomLevelCode = bloomLevelCode;
        LinkedPloIds = linkedPloIds ?? [];
        CreatedAt = DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public Guid CourseId { get; private set; }
    public string Code { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string? BloomLevelCode { get; private set; }
    public List<Guid> LinkedPloIds { get; private set; } = [];
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void Update(
        string code,
        string description,
        string? bloomLevelCode,
        List<Guid>? linkedPloIds)
    {
        Code = code;
        Description = description;
        BloomLevelCode = bloomLevelCode;
        LinkedPloIds = linkedPloIds ?? [];
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
