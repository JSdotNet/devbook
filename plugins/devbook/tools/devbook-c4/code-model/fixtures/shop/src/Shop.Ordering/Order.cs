using Shop.Kernel;

namespace Shop.Ordering;

// An abstract base is no root of its own; its public members show on the root that derives from it.
public abstract class OrderingRoot : IAggregateRoot
{
    public DateTime CreatedAt { get; init; }
}

public sealed class Order : OrderingRoot
{
    private readonly List<OrderLine> _lines = [];

    public OrderId Id { get; init; }

    public IReadOnlyList<OrderLine> Lines => _lines;

    public Address? ShipTo { get; private set; }

    public Dictionary<string, List<OrderLine>> ByWarehouse { get; } = [];

    public IReadOnlyList<Note> Notes { get; init; } = [];

    public (int Count, decimal Sum) Totals => (_lines.Count, _lines.Sum(l => l.Price.Amount * l.Quantity));

    public void Place(Address shipTo) => ShipTo = shipTo;

    public OrderPlaced Cancel(string reason) => new(Id, reason);

    // A nested value object is drawn as Order_Note.
    public sealed record Note(string Text) : IValueObject;
}

public sealed class OrderLine : IEntity
{
    public Money Price { get; init; } = new(0, "EUR");

    public Legacy.Money? LegacyPrice { get; init; }

    public int Quantity { get; init; }
}

public readonly record struct OrderId(Guid Value) : IValueObject;

public sealed record Money(decimal Amount, string Currency) : IValueObject;

// A value object no domain/ chapter carries in `aliases`: reported.
public sealed record Address(string Street, string City) : IValueObject;

public sealed record OrderPlaced(OrderId Order, string Reason) : IDomainEvent;
