namespace BrainMemo.Course.Api.DTOs;

public sealed record CourseUpsertRequest(
    string Name,
    string? Description = null,
    string? AccessMode = null,
    string? Status = null,
    IReadOnlyList<string>? Tags = null,
    string? CoverUploadKey = null,
    bool? RemoveCover = null);
