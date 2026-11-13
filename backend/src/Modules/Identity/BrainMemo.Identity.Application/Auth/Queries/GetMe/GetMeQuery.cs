using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Identity.Application.Auth.Models;

namespace BrainMemo.Identity.Application.Auth.Queries.GetMe;

/// <summary>
/// Retrieves the profile summary and status of the currently authenticated user (GET /auth/me).
/// </summary>
public sealed record GetMeQuery(Guid UserId) : IQuery<CurrentUserDto>
{
    public override string ToString()
        => $"GetMeQuery {{ UserId = {UserId} }}";
}
