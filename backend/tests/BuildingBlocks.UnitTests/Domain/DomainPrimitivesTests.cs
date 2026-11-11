using BrainMemo.BuildingBlocks.Infrastructure.Time;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Time;
using Xunit;

namespace BuildingBlocks.UnitTests.Domain;

public sealed class DomainPrimitivesTests
{
    [Fact]
    public void Entity_EqualityDependsOnTypeAndNonDefaultId()
    {
        Guid id = UuidV7.NewGuid();
        SampleEntity a = new(id);
        SampleEntity b = new(id);
        SampleEntity c = new(UuidV7.NewGuid());
        OtherEntity d = new(id);

        Assert.True(a == b);
        Assert.False(a == c);
        Assert.False(a.Equals(d));

        SampleEntity transient1 = new();
        SampleEntity transient2 = new();
        Assert.True(transient1.IsTransient);
        Assert.False(transient1 == transient2);
    }

    [Fact]
    public void AggregateRoot_RecordsAndClearsDomainEvents()
    {
        SampleAggregate aggregate = new(UuidV7.NewGuid());
        aggregate.DoWork(DateTimeOffset.UtcNow);

        Assert.Single(aggregate.DomainEvents);

        aggregate.ClearDomainEvents();
        Assert.Empty(aggregate.DomainEvents);
    }

    [Fact]
    public void ValueObject_UsesStructuralEquality()
    {
        Money m1 = new(100, "VND");
        Money m2 = new(100, "VND");
        Money m3 = new(200, "VND");

        Assert.Equal(m1, m2);
        Assert.Equal(m1.GetHashCode(), m2.GetHashCode());
        Assert.NotEqual(m1, m3);
    }

    [Fact]
    public void UuidV7_ProducesVersion7Guids_AndSystemClockReturnsUtc()
    {
        Guid id = UuidV7.NewGuid();
        Assert.Equal(7, id.Version);

        IClock clock = new SystemClock();
        DateTimeOffset now = clock.UtcNow;
        Assert.Equal(TimeSpan.Zero, now.Offset);
    }

    private sealed class SampleEntity : Entity
    {
        public SampleEntity()
        {
        }

        public SampleEntity(Guid id)
            : base(id)
        {
        }
    }

    private sealed class OtherEntity(Guid id) : Entity(id);

    private sealed record SampleDomainEvent(Guid EventId, DateTimeOffset OccurredAt) : IDomainEvent;

    private sealed class SampleAggregate(Guid id) : AggregateRoot(id)
    {
        public void DoWork(DateTimeOffset now) => RaiseDomainEvent(new SampleDomainEvent(UuidV7.NewGuid(), now));
    }

    private sealed class Money(decimal amount, string currency) : ValueObject
    {
        protected override IEnumerable<object?> GetEqualityComponents()
        {
            yield return amount;
            yield return currency;
        }
    }
}
