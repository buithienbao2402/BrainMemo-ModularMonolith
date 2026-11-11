namespace BrainMemo.BuildingBlocks.Abstractions.Ai;

public sealed record LlmResult(
    bool IsSuccess,
    string? JsonContent,
    string? ErrorCode = null,
    string? ErrorMessage = null,
    string? Provider = null);

/// <summary>
/// External LLM client abstraction (Gemini default, configurable via ai.llm_provider; DEC-21).
/// </summary>
public interface ILlmClient
{
    Task<LlmResult> GenerateJson(
        string systemPrompt,
        string userPrompt,
        TimeSpan timeout,
        CancellationToken ct = default);
}
