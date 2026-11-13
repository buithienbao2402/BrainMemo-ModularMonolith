namespace BrainMemo.Content.Api.DTOs;

public sealed record ReorderChaptersRequest(
    IReadOnlyList<Guid> ChapterIds);
