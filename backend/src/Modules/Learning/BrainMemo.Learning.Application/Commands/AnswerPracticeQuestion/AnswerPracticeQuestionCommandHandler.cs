using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Learning.Application.Commands.CompleteBlock;
using BrainMemo.SharedKernel.Results;
using MediatR;

namespace BrainMemo.Learning.Application.Commands.AnswerPracticeQuestion;

public sealed class AnswerPracticeQuestionCommandHandler(
    IContentContract contentContract,
    ICourseContract courseContract,
    ISender sender) : ICommandHandler<AnswerPracticeQuestionCommand, PracticeAnswerResultDto>
{
    public async Task<Result<PracticeAnswerResultDto>> Handle(AnswerPracticeQuestionCommand request, CancellationToken ct)
    {
        Result<PracticeResultDto> evalResult = contentContract.EvaluatePracticeAnswer(request.BlockId, request.Answer);
        if (!evalResult.IsSuccess)
        {
            return Result.Failure<PracticeAnswerResultDto>(evalResult.Error);
        }

        if (request.CurrentUserId.HasValue)
        {
            Result<PublishedBlockRef> blockResult = contentContract.GetPublishedBlock(request.BlockId);
            if (blockResult.IsSuccess)
            {
                Result<ChapterAccessResult> accessResult = courseContract.CheckChapterAccess(request.CourseId, blockResult.Value.ChapterId, request.CurrentUserId.Value);
                if (accessResult.IsSuccess && accessResult.Value.Allowed && accessResult.Value.CanSaveProgress)
                {
                    // For enrolled learners, mark the practice block completed (idempotent, FR-LRN-03 / 3.4.1)
                    await sender.Send(new CompleteBlockCommand(request.CourseId, request.BlockId, request.CurrentUserId.Value), ct).ConfigureAwait(false);
                }
            }
        }

        return Result.Success(new PracticeAnswerResultDto(
            IsCorrect: evalResult.Value.IsCorrect,
            Explanation: evalResult.Value.Explanation));
    }
}
