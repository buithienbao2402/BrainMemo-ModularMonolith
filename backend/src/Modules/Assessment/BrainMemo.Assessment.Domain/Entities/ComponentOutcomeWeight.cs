using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Assessment.Domain.Entities;

public class ComponentOutcomeWeight : Entity
{
    private ComponentOutcomeWeight() { }

    public ComponentOutcomeWeight(
        Guid id,
        Guid componentId,
        Guid cloId,
        decimal weight)
        : base(id)
    {
        ComponentId = componentId;
        CloId = cloId;
        Weight = weight;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public Guid ComponentId { get; private set; }
    public Guid CloId { get; private set; }
    public decimal Weight { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public void UpdateWeight(decimal weight)
    {
        Weight = weight;
    }
}
