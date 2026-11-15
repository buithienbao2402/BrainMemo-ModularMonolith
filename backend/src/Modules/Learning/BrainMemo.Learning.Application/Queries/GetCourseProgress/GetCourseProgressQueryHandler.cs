using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Application.Common;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Queries.GetCourseProgress;

public sealed class GetCourseProgressQueryHandler(
    ILearningRepository learningRepository,
    IContentContract contentContract) : IQueryHandler<GetCourseProgressQuery, CourseProgressDto>
{
    public async Task<Result<CourseProgressDto>> Handle(GetCourseProgressQuery request, CancellationToken ct)
    {
        CourseProgressDto progress = await LearningProgressCalculator.CalculateProgressAsync(
            request.CourseId,
            request.CurrentUserId,
            learningRepository,
            contentContract,
            ct).ConfigureAwait(false);

        return Result.Success(progress);
    }
}
