using Shop.Kernel;

namespace Shop.Catalog;

// Marked by its base classes rather than an interface.
public sealed class Product : AggregateRoot
{
    public required Sku Sku { get; init; }

    public Sku[] Variants { get; init; } = [];
}

public sealed class Sku : ValueObject
{
    public required string Code { get; init; }
}
