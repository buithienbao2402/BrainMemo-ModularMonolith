using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Identity.Application.Auth.Commands.LogoutAll;

/// <summary>
/// Revokes all active sessions for the specified user (FR-IDN-10).
/// </summary>
public sealed record LogoutAllCommand(Guid UserId) : ICommand;
