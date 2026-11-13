using System.Text.Json;

namespace BrainMemo.Notification.Application.DTOs;

public sealed record NotificationDto(
    Guid Id,
    string Type,
    JsonElement Payload,
    string? Title,
    string? Body,
    DateTimeOffset? ReadAt,
    DateTimeOffset CreatedAt);
