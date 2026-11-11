namespace BrainMemo.SharedKernel.Results;

/// <summary>
/// Represents a structured domain or application error returned instead of throwing business exceptions.
/// </summary>
public sealed record Error(
    string Code,
    string Message,
    IReadOnlyList<ValidationFailureDetail>? Details = null,
    IReadOnlyDictionary<string, object?>? Metadata = null)
{
    public static readonly Error None = new(string.Empty, string.Empty);

    public static Error Validation(
        string message,
        IReadOnlyList<ValidationFailureDetail>? details = null)
        => new(ErrorCodes.ValidationFailed, message, details);

    public static Error NotFound(string message)
        => new(ErrorCodes.NotFound, message);

    public static Error Forbidden(string message)
        => new(ErrorCodes.Forbidden, message);

    public static Error Unauthenticated(string message)
        => new(ErrorCodes.Unauthenticated, message);

    public static Error Conflict(string code, string message)
        => new(code, message);
}
