using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Queries.ReadChapter;

public sealed class ReadChapterQueryHandler(
    ICourseContract courseContract,
    IContentContract contentContract,
    ILearningRepository learningRepository) : IQueryHandler<ReadChapterQuery, LearnChapterDto>
{
    public async Task<Result<LearnChapterDto>> Handle(ReadChapterQuery request, CancellationToken ct)
    {
        Result<ChapterAccessResult> accessCheck = courseContract.CheckChapterAccess(request.CourseId, request.ChapterId, request.CurrentUserId);
        if (!accessCheck.IsSuccess)
        {
            return Result.Failure<LearnChapterDto>(accessCheck.Error);
        }

        ChapterAccessResult access = accessCheck.Value;
        if (!access.Allowed)
        {
            return access.Reason switch
            {
                "COURSE_DENIED" => request.CurrentUserId is null
                    ? Result.Failure<LearnChapterDto>(Error.Unauthenticated("Vui lòng đăng nhập để truy cập nội dung này."))
                    : Result.Failure<LearnChapterDto>(Error.NotFound("Không tìm thấy nội dung khóa học.")),
                "NOT_ENROLLED" => Result.Failure<LearnChapterDto>(new Error("NOT_ENROLLED", "Cần ghi danh để học nội dung này.")),
                "PASSCODE_REQUIRED" => Result.Failure<LearnChapterDto>(new Error("PASSCODE_REQUIRED", "Chương yêu cầu mở khóa bằng passcode.")),
                "NOT_FOUND" => Result.Failure<LearnChapterDto>(Error.NotFound("Không tìm thấy chương.")),
                _ => Result.Failure<LearnChapterDto>(Error.Forbidden("Không có quyền truy cập.")),
            };
        }

        Result<PublishedChapterContentDto> chapterResult = contentContract.GetPublishedChapterContent(request.ChapterId);
        if (!chapterResult.IsSuccess)
        {
            return Result.Failure<LearnChapterDto>(chapterResult.Error);
        }

        PublishedChapterContentDto chapter = chapterResult.Value;
        HashSet<Guid> completedBlockIds = [];

        if (request.CurrentUserId.HasValue && access.CanSaveProgress)
        {
            IReadOnlyList<BlockCompletion> completions = await learningRepository
                .ListBlockCompletionsForChapterAsync(request.CurrentUserId.Value, request.ChapterId, ct)
                .ConfigureAwait(false);

            completedBlockIds = completions.Select(c => c.BlockId).ToHashSet();
        }

        List<LearnBlockDto> blocks = [];
        foreach (PublishedBlockRef block in chapter.Blocks.OrderBy(b => b.Position))
        {
            bool completed = completedBlockIds.Contains(block.BlockId);
            object? flashcardsObj = null;
            if (!string.IsNullOrWhiteSpace(block.Flashcards))
            {
                try
                {
                    flashcardsObj = System.Text.Json.JsonSerializer.Deserialize<object>(block.Flashcards);
                }
                catch
                {
                    // Ignore malformed flashcards JSON
                }
            }

            object? questionObj = null;
            if (block.BlockType == "QUESTION")
            {
                Result<PracticeQuestionDto> qResult = contentContract.GetQuestionForPractice(block.BlockId);
                if (qResult.IsSuccess)
                {
                    questionObj = qResult.Value;
                }
            }

            object? quizObj = null;
            if (block.BlockType == "QUIZ")
            {
                Result<QuizDefinitionDto> qzResult = contentContract.GetPublishedQuizDefinition(block.BlockId);
                if (qzResult.IsSuccess)
                {
                    quizObj = qzResult.Value;
                }
            }

            string? resourceUrl = null;
            if (block.ResourceId.HasValue)
            {
                resourceUrl = $"/api/v1/courses/{request.CourseId}/resources/{block.ResourceId.Value}/download-url";
            }

            blocks.Add(new LearnBlockDto(
                Id: block.BlockId,
                BlockType: block.BlockType,
                Position: block.Position,
                Completed: completed,
                Title: block.Title,
                Body: block.Body,
                ResourceUrl: resourceUrl,
                Flashcards: flashcardsObj,
                Question: questionObj,
                QuizSummary: quizObj));
        }

        return Result.Success(new LearnChapterDto(
            Id: chapter.ChapterId,
            Title: chapter.Title,
            Description: chapter.Description,
            VersionNo: chapter.VersionNo,
            CanSaveProgress: access.CanSaveProgress,
            Blocks: blocks));
    }
}
