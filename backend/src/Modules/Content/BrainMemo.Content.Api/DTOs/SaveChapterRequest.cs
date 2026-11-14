using BrainMemo.Content.Contracts.Dtos;

namespace BrainMemo.Content.Api.DTOs;

public sealed record SaveChapterRequest(
    int BaseVersionNo,
    string Title,
    string? Description,
    IReadOnlyList<BlockDto> Blocks);
