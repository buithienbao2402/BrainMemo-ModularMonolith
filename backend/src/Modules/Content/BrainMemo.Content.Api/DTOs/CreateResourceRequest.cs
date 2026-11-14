namespace BrainMemo.Content.Api.DTOs;

public sealed record CreateResourceRequest(
    string UploadKey,
    string OriginalFilename);
