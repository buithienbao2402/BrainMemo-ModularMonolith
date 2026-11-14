namespace BrainMemo.Content.Api.DTOs;

public sealed record CreateChapterRequest(
    string Title,
    string? Description);
