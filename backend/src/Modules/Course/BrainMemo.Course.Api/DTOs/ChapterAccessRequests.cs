namespace BrainMemo.Course.Api.DTOs;

public sealed record SetChapterAccessRequest(string AccessMode, string? Passcode);

public sealed record UnlockChapterRequest(string Passcode);
