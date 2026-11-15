namespace BrainMemo.Learning.Api.DTOs;

public sealed record SetBookmarkRequest(Guid ChapterId);

public sealed record PracticeAnswerRequest(
    IReadOnlyList<Guid>? SelectedOptionIds = null,
    string? TextAnswer = null);
