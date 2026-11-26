namespace Shop.Kernel.Audit;

// An aggregate root in a folder no building block's `code` names: reported, never drawn.
public sealed class AuditEntry : IAggregateRoot
{
    public string Message { get; init; } = "";
}
