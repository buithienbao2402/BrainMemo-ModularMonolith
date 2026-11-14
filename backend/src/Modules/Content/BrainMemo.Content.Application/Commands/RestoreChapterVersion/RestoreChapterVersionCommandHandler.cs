using System.Text.Json;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Application.Common;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Commands.RestoreChapterVersion;

public sealed class RestoreChapterVersionCommandHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : ICommandHandler<RestoreChapterVersionCommand, ChapterDetailDto>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public async Task<Result<ChapterDetailDto>> Handle(RestoreChapterVersionCommand request, CancellationToken cancellationToken)
    {
        // 1. Verify owner access
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.RequesterUserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure<ChapterDetailDto>(new Error("COURSE_NOT_FOUND", "Course not found."));
        }

        if (accessResult.Value.EffectiveState == "DELETED")
        {
            return Result.Failure<ChapterDetailDto>(new Error("COURSE_DELETED", "Course has been deleted."));
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure<ChapterDetailDto>(new Error("FORBIDDEN", "Only the course owner can restore chapter versions."));
        }

        // 2. Lookup chapter
        Chapter? chapter = await contentRepository.GetChapterByIdAsync(request.ChapterId, cancellationToken);
        if (chapter is null || chapter.CourseId != request.CourseId || chapter.IsDeleted)
        {
            return Result.Failure<ChapterDetailDto>(new Error("CHAPTER_NOT_FOUND", "Chapter not found."));
        }

        // 3. Lookup target version
        ChapterVersion? targetVersion = await contentRepository.GetChapterVersionAsync(chapter.Id, request.VersionNo, cancellationToken);
        if (targetVersion is null)
        {
            return Result.Failure<ChapterDetailDto>(new Error("VERSION_NOT_FOUND", $"Phiên bản {request.VersionNo} không tồn tại."));
        }

        // 4. Parse snapshot
        ChapterSnapshotModel? snapshot;
        try
        {
            snapshot = JsonSerializer.Deserialize<ChapterSnapshotModel>(targetVersion.Snapshot, JsonOptions);
        }
        catch (Exception ex)
        {
            return Result.Failure<ChapterDetailDto>(new Error("CORRUPTED_SNAPSHOT", $"Không thể phân tích dữ liệu snapshot của phiên bản {request.VersionNo}: {ex.Message}"));
        }

        if (snapshot is null)
        {
            return Result.Failure<ChapterDetailDto>(new Error("CORRUPTED_SNAPSHOT", $"Dữ liệu snapshot của phiên bản {request.VersionNo} rỗng."));
        }

        // 5. Validate references per §3.6.6.1 (tài nguyên chưa bị xóa, câu hỏi tồn tại)
        foreach (SnapshotBlockModel sb in snapshot.Blocks)
        {
            if (sb.ResourceId.HasValue)
            {
                Resource? res = await contentRepository.GetResourceByIdAsync(sb.ResourceId.Value, cancellationToken);
                if (res is null || res.IsDeleted)
                {
                    return Result.Failure<ChapterDetailDto>(new Error(
                        "RESTORE_BLOCKED",
                        $"Không thể khôi phục phiên bản {request.VersionNo} vì tài nguyên tham chiếu '{sb.ResourceId.Value}' không còn tồn tại hoặc đã bị xóa."));
                }
            }

            if (sb.QuestionId.HasValue)
            {
                Question? q = await contentRepository.GetQuestionByIdAsync(sb.QuestionId.Value, cancellationToken);
                if (q is null)
                {
                    return Result.Failure<ChapterDetailDto>(new Error(
                        "RESTORE_BLOCKED",
                        $"Không thể khôi phục phiên bản {request.VersionNo} vì câu hỏi tham chiếu '{sb.QuestionId.Value}' không còn tồn tại."));
                }
            }

            if (sb.QuizConfig?.Questions is not null)
            {
                foreach (SnapshotQuizQuestionModel qq in sb.QuizConfig.Questions)
                {
                    Question? q = await contentRepository.GetQuestionByIdAsync(qq.QuestionId, cancellationToken);
                    if (q is null)
                    {
                        return Result.Failure<ChapterDetailDto>(new Error(
                            "RESTORE_BLOCKED",
                            $"Không thể khôi phục phiên bản {request.VersionNo} vì câu hỏi '{qq.QuestionId}' trong bài kiểm tra không còn tồn tại."));
                    }
                }
            }
        }

        // 6. Overwrite working draft (Block ID preserved, restore to DRAFT only per §3.6.6.1)
        chapter.UpdateDetails(snapshot.Title, snapshot.Description);

        var restoredBlocks = new List<Block>();
        foreach (SnapshotBlockModel sb in snapshot.Blocks)
        {
            string normalizedType = sb.BlockType.Replace("_", string.Empty);
            Enum.TryParse<BlockType>(normalizedType, true, out var blockType);
            Enum.TryParse<AiReviewStatus>(sb.AiReviewStatus ?? "NotApplicable", true, out var aiReviewStatus);
            string? flashcardsJson = sb.Flashcards is not null ? JsonSerializer.Serialize(sb.Flashcards, JsonOptions) : null;

            var block = new Block(
                sb.Id,
                chapter.Id,
                blockType,
                sb.Position,
                sb.Title,
                sb.Body,
                sb.ResourceId,
                sb.QuestionId,
                flashcardsJson,
                aiReviewStatus: aiReviewStatus);

            restoredBlocks.Add(block);

            if (sb.QuizConfig is not null)
            {
                Enum.TryParse<QuizResultDisplay>(sb.QuizConfig.ResultDisplay ?? "Immediate", true, out var resultDisplay);
                var quizConfig = new QuizConfig(
                    sb.Id,
                    sb.QuizConfig.OpenAt,
                    sb.QuizConfig.CloseAt,
                    sb.QuizConfig.TimeLimitMinutes.HasValue ? (ushort)sb.QuizConfig.TimeLimitMinutes.Value : null,
                    sb.QuizConfig.MaxAttempts.HasValue ? (byte)sb.QuizConfig.MaxAttempts.Value : null,
                    sb.QuizConfig.PassScore,
                    resultDisplay,
                    sb.QuizConfig.ShuffleQuestions,
                    sb.QuizConfig.ShuffleOptions,
                    null);

                var quizQuestions = sb.QuizConfig.Questions?.Select(q => new QuizQuestion(
                    sb.Id,
                    q.QuestionId,
                    q.Position,
                    q.Points)).ToList();

                var quizRules = sb.QuizConfig.RandomRules?.Select(r =>
                {
                    QuestionType? qType = null;
                    if (!string.IsNullOrEmpty(r.FilterQuestionType) && Enum.TryParse<QuestionType>(r.FilterQuestionType, true, out var parsed))
                    {
                        qType = parsed;
                    }
                    return new QuizRandomRule(
                        Guid.NewGuid(),
                        sb.Id,
                        (ushort)r.Position,
                        (ushort)r.PickCount,
                        r.PointsEach,
                        r.FilterTag,
                        r.FilterDifficultyCode.HasValue ? (byte)r.FilterDifficultyCode.Value : null,
                        qType);
                }).ToList();

                await contentRepository.SaveQuizConfigAsync(quizConfig, quizQuestions, quizRules, null, cancellationToken);
            }
            else if (sb.AssignmentConfig is not null)
            {
                var assignmentConfig = new AssignmentConfig(
                    sb.Id,
                    sb.AssignmentConfig.DueAt,
                    sb.AssignmentConfig.MaxPoints,
                    sb.AssignmentConfig.MaxFileSizeBytes > 0 ? (uint)sb.AssignmentConfig.MaxFileSizeBytes : 20971520);

                await contentRepository.SaveAssignmentConfigAsync(assignmentConfig, cancellationToken);
            }
        }

        await contentRepository.ReplaceBlocksAsync(chapter.Id, restoredBlocks, cancellationToken);

        // 7. Create new version snapshot record with restored_from_version_no = versionNo
        int newVersionNo = chapter.LastVersionNo + 1;
        var newVersion = new ChapterVersion(Guid.NewGuid(), chapter.Id, newVersionNo, targetVersion.Snapshot, restoredFromVersionNo: request.VersionNo);
        await contentRepository.AddChapterVersionAsync(newVersion, cancellationToken);

        chapter.IncrementVersion();
        await contentRepository.UpdateChapterAsync(chapter, cancellationToken);

        await contentRepository.SaveChangesAsync(cancellationToken);

        ChapterDetailDto detail = await ChapterDetailMapper.MapToDetailDtoAsync(chapter, restoredBlocks, contentRepository, cancellationToken);
        return Result.Success(detail);
    }

    private sealed class ChapterSnapshotModel
    {
        public int SchemaVersion { get; set; } = 1;
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public List<SnapshotBlockModel> Blocks { get; set; } = [];
    }

    private sealed class SnapshotBlockModel
    {
        public Guid Id { get; set; }
        public string BlockType { get; set; } = string.Empty;
        public int Position { get; set; }
        public string? Title { get; set; }
        public string? Body { get; set; }
        public Guid? ResourceId { get; set; }
        public Guid? QuestionId { get; set; }
        public List<Flashcard>? Flashcards { get; set; }
        public string? AiReviewStatus { get; set; }
        public SnapshotQuizConfigModel? QuizConfig { get; set; }
        public SnapshotAssignmentConfigModel? AssignmentConfig { get; set; }
    }

    private sealed class SnapshotQuizConfigModel
    {
        public DateTimeOffset? OpenAt { get; set; }
        public DateTimeOffset? CloseAt { get; set; }
        public int? TimeLimitMinutes { get; set; }
        public int? MaxAttempts { get; set; }
        public decimal? PassScore { get; set; }
        public string? ResultDisplay { get; set; }
        public bool ShuffleQuestions { get; set; }
        public bool ShuffleOptions { get; set; }
        public bool HasPassword { get; set; }
        public List<SnapshotQuizQuestionModel>? Questions { get; set; }
        public List<SnapshotQuizRandomRuleModel>? RandomRules { get; set; }
    }

    private sealed class SnapshotQuizQuestionModel
    {
        public Guid QuestionId { get; set; }
        public int Position { get; set; }
        public decimal Points { get; set; }
    }

    private sealed class SnapshotQuizRandomRuleModel
    {
        public int Position { get; set; }
        public int PickCount { get; set; }
        public decimal PointsEach { get; set; }
        public string? FilterTag { get; set; }
        public int? FilterDifficultyCode { get; set; }
        public string? FilterQuestionType { get; set; }
    }

    private sealed class SnapshotAssignmentConfigModel
    {
        public DateTimeOffset? DueAt { get; set; }
        public decimal? MaxPoints { get; set; }
        public int MaxFileSizeBytes { get; set; }
    }
}
