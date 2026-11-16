using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Moderation.Contracts;

public interface IModerationContract
{
    /// <summary>
    /// Idempotent creation of a moderation report from an AI scan finding without applying sanctions (contracts/moderation.md §2).
    /// </summary>
    Task<Result<Guid>> SubmitAiFlag(
        Guid aiFindingId,
        ReportTargetType targetType,
        Guid targetId,
        Guid targetCourseId,
        Guid targetOwnerUserId,
        string reasonCode,
        string contentSnapshot,
        decimal score,
        CancellationToken ct = default);
}
