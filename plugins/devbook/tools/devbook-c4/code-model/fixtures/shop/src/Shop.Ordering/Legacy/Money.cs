using Shop.Kernel;

namespace Shop.Ordering.Legacy;

// A second Money in the same diagram: drawn as Money_2 and reported.
public sealed record Money(decimal Cents) : IValueObject;
