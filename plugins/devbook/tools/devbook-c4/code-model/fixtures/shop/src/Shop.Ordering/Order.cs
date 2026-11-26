using Shop.Kernel;

namespace Shop.Ordering;

public sealed class Order : IAggregateRoot
{
    private readonly List<OrderLine> _lines = [];

    public OrderId Id { get; init; }

    public IReadOnlyList<OrderLine> Lines => _lines;

    public Address? ShipTo { get; private set; }

    public void Place(Address shipTo) => ShipTo = shipTo;

    public OrderPlaced Cancel(string reason) => new(Id, reason);
}

public sealed class OrderLine : IEntity
{
    public Money Price { get; init; } = new(0, "EUR");

    public int Quantity { get; init; }
}

public readonly record struct OrderId(Guid Value) : IValueObject;

public sealed record Money(decimal Amount, string Currency) : IValueObject;

// A value object no domain/ chapter carries in `aliases`: reported.
public sealed record Address(string Street, string City) : IValueObject;

public sealed record OrderPlaced(OrderId Order, string Reason) : IDomainEvent;
