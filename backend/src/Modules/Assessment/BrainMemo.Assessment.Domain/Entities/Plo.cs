using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Assessment.Domain.Entities;

public class Plo : AggregateRoot
{
    private Plo() { }

    public Plo(
        Guid id,
        Guid courseId,
        string code,
        string description)
        : base(id)
    {
        CourseId = courseId;
        Code = code;
        Description = description;
        CreatedAt = DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public Guid CourseId { get; private set; }
    public string Code { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void Update(string code, string description)
    {
        Code = code;
        Description = description;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
