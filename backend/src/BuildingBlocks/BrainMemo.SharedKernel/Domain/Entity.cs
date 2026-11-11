namespace BrainMemo.SharedKernel.Domain;

/// <summary>
/// Base entity with identity-based equality.
/// </summary>
public abstract class Entity<TId> : IEquatable<Entity<TId>>
    where TId : notnull
{
    protected Entity()
    {
    }

    protected Entity(TId id)
    {
        Id = id;
    }

    public TId Id { get; protected init; } = default!;

    public bool IsTransient => EqualityComparer<TId>.Default.Equals(Id, default!);

    public bool Equals(Entity<TId>? other)
    {
        if (other is null)
        {
            return false;
        }

        if (ReferenceEquals(this, other))
        {
            return true;
        }

        if (GetType() != other.GetType())
        {
            return false;
        }

        if (IsTransient || other.IsTransient)
        {
            return false;
        }

        return EqualityComparer<TId>.Default.Equals(Id, other.Id);
    }

    public override bool Equals(object? obj)
        => obj is Entity<TId> other && Equals(other);

    public override int GetHashCode()
        => IsTransient ? base.GetHashCode() : HashCode.Combine(GetType(), Id);

    public static bool operator ==(Entity<TId>? left, Entity<TId>? right)
        => Equals(left, right);

    public static bool operator !=(Entity<TId>? left, Entity<TId>? right)
        => !Equals(left, right);
}

/// <summary>
/// Convenience base entity keyed by UUIDv7 <see cref="Guid"/>.
/// </summary>
public abstract class Entity : Entity<Guid>
{
    protected Entity()
    {
    }

    protected Entity(Guid id)
        : base(id)
    {
    }
}
