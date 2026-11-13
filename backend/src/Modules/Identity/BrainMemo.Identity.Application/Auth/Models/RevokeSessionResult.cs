namespace BrainMemo.Identity.Application.Auth.Models;

/// <summary>
/// Result indicating whether a revoked session matched the caller's active refresh session.
/// </summary>
public sealed record RevokeSessionResult(bool WasCurrent);
