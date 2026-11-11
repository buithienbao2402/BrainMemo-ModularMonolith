namespace BrainMemo.BuildingBlocks.Abstractions.Ai;

public sealed record ModerationScore(
    double Score,
    bool Flagged,
    string? Label = null,
    string? Model = null);

/// <summary>
/// Client for local Python PhoBERT ONNX moderation scoring service (contracts/README.md §2).
/// </summary>
public interface IPhoBertClient
{
    Task<ModerationScore> Score(string text, CancellationToken ct = default);
}
