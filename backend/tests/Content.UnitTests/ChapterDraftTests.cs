using System.Text.Json;
using BrainMemo.Content.Application.Commands.CreateChapter;
using BrainMemo.Content.Application.Commands.DeleteChapter;
using BrainMemo.Content.Application.Commands.ReorderChapters;
using BrainMemo.Content.Application.Commands.SaveChapterDraft;
using BrainMemo.Content.Application.Common;
using BrainMemo.Content.Application.Queries.GetChapterDraft;
using BrainMemo.Content.Application.Queries.ListChapters;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using Xunit;

namespace Content.UnitTests;

public sealed class ChapterDraftTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;
    private static readonly Guid CourseId = Guid.NewGuid();
    private static readonly Guid OwnerUserId = Guid.NewGuid();
    private static readonly Guid OtherUserId = Guid.NewGuid();

    private readonly FakeContentRepository _repository = new();
    private readonly FakeCourseContract _courseContract = new();
    private readonly HtmlSanitizer _sanitizer = new();

    public ChapterDraftTests()
    {
        _courseContract.AddCourse(CourseId, OwnerUserId, accessMode: "PUBLIC", state: "ACTIVE");
    }

    #region CreateChapter

    [Fact]
    public async Task CreateChapter_WhenOwner_CreatesChapterWithInitialVersion()
    {
        CreateChapterCommandHandler handler = new(_repository, _courseContract);
        CreateChapterCommand command = new(CourseId, OwnerUserId, "Chương 1: Giới thiệu", "Mô tả chương 1");

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Chương 1: Giới thiệu", result.Value.Title);
        Assert.Equal(1, result.Value.Position);
        Assert.Equal(1, result.Value.LastVersionNo);
        Assert.Null(result.Value.PublishedVersionNo);
        Assert.Equal("DRAFT", result.Value.Status);

        Chapter? chapterInDb = await _repository.GetChapterByIdAsync(result.Value.Id);
        Assert.NotNull(chapterInDb);
        Assert.Equal(1, chapterInDb.LastVersionNo);

        ChapterVersion? v1 = await _repository.GetChapterVersionAsync(result.Value.Id, 1);
        Assert.NotNull(v1);
        Assert.Contains("\"schemaVersion\":1", v1.Snapshot);
    }

    [Fact]
    public async Task CreateChapter_SequentialPositions_IncrementsAutomatically()
    {
        CreateChapterCommandHandler handler = new(_repository, _courseContract);

        Result<ChapterDetailDto> r1 = await handler.Handle(new CreateChapterCommand(CourseId, OwnerUserId, "Chương 1", null), CancellationToken.None);
        Result<ChapterDetailDto> r2 = await handler.Handle(new CreateChapterCommand(CourseId, OwnerUserId, "Chương 2", null), CancellationToken.None);

        Assert.True(r1.IsSuccess);
        Assert.True(r2.IsSuccess);
        Assert.Equal(1, r1.Value.Position);
        Assert.Equal(2, r2.Value.Position);
    }

    [Fact]
    public async Task CreateChapter_WhenNotOwner_ReturnsForbidden()
    {
        CreateChapterCommandHandler handler = new(_repository, _courseContract);
        CreateChapterCommand command = new(CourseId, OtherUserId, "Chương của người khác", null);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.Forbidden, result.Error.Code);
    }

    [Fact]
    public async Task CreateChapter_WhenEmptyTitle_ReturnsValidationFailed()
    {
        CreateChapterCommandHandler handler = new(_repository, _courseContract);
        CreateChapterCommand command = new(CourseId, OwnerUserId, "   ", null);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("CHAPTER_TITLE_REQUIRED", result.Error.Code);
    }

    #endregion

    #region ReorderChapters

    [Fact]
    public async Task ReorderChapters_WhenValid_UpdatesAllPositions()
    {
        Chapter c1 = new(Guid.NewGuid(), CourseId, "Chương 1", null, 1);
        Chapter c2 = new(Guid.NewGuid(), CourseId, "Chương 2", null, 2);
        Chapter c3 = new(Guid.NewGuid(), CourseId, "Chương 3", null, 3);

        await _repository.AddChapterAsync(c1);
        await _repository.AddChapterAsync(c2);
        await _repository.AddChapterAsync(c3);

        ReorderChaptersCommandHandler handler = new(_repository, _courseContract);
        ReorderChaptersCommand command = new(CourseId, OwnerUserId, [c3.Id, c1.Id, c2.Id]);

        Result result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(1, c3.Position);
        Assert.Equal(2, c1.Position);
        Assert.Equal(3, c2.Position);
    }

    [Fact]
    public async Task ReorderChapters_WhenNotOwner_ReturnsForbidden()
    {
        Chapter c1 = new(Guid.NewGuid(), CourseId, "Chương 1", null, 1);
        await _repository.AddChapterAsync(c1);

        ReorderChaptersCommandHandler handler = new(_repository, _courseContract);
        ReorderChaptersCommand command = new(CourseId, OtherUserId, [c1.Id]);

        Result result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.Forbidden, result.Error.Code);
    }

    #endregion

    #region DeleteChapter

    [Fact]
    public async Task DeleteChapter_WhenOwner_SoftDeletesChapter()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương cần xóa", null, 1);
        await _repository.AddChapterAsync(chapter);

        DeleteChapterCommandHandler handler = new(_repository, _courseContract);
        DeleteChapterCommand command = new(CourseId, chapter.Id, OwnerUserId);

        Result result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(chapter.IsDeleted);
        Assert.NotNull(chapter.DeletedAt);
    }

    [Fact]
    public async Task DeleteChapter_WhenNotOwner_ReturnsForbidden()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương cần xóa", null, 1);
        await _repository.AddChapterAsync(chapter);

        DeleteChapterCommandHandler handler = new(_repository, _courseContract);
        DeleteChapterCommand command = new(CourseId, chapter.Id, OtherUserId);

        Result result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.Forbidden, result.Error.Code);
        Assert.False(chapter.IsDeleted);
    }

    #endregion

    #region SaveChapterDraft & Optimistic Locking

    [Fact]
    public async Task SaveChapterDraft_WhenBaseVersionMatches_SucceedsAndIncrementsVersion()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Tiêu đề cũ", "Mô tả cũ", 1);
        await _repository.AddChapterAsync(chapter);

        SaveChapterDraftCommandHandler handler = new(_repository, _courseContract, _sanitizer);
        Guid blockId = Guid.NewGuid();
        BlockDto richTextBlock = new(
            Id: blockId,
            BlockType: "RICH_TEXT",
            Position: 1,
            Title: null,
            Body: "<p>Nội dung mới của bài học</p>",
            ResourceId: null,
            QuestionId: null,
            Flashcards: null,
            AiReviewStatus: "NOT_APPLICABLE",
            QuizConfig: null,
            AssignmentConfig: null);

        SaveChapterDraftCommand command = new(
            CourseId: CourseId,
            ChapterId: chapter.Id,
            RequesterUserId: OwnerUserId,
            BaseVersionNo: 1,
            Title: "Tiêu đề mới",
            Description: "Mô tả mới",
            Blocks: [richTextBlock]);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.LastVersionNo);
        Assert.Equal("Tiêu đề mới", result.Value.Title);
        Assert.Single(result.Value.Blocks);
        Assert.Equal(blockId, result.Value.Blocks[0].Id);

        // Verify version 2 was recorded in repository
        ChapterVersion? v2 = await _repository.GetChapterVersionAsync(chapter.Id, 2);
        Assert.NotNull(v2);
        Assert.Equal(2, v2.VersionNo);

        // Verify blocks in repository
        IReadOnlyList<Block> blocksInDb = await _repository.GetBlocksByChapterIdAsync(chapter.Id);
        Assert.Single(blocksInDb);
        Assert.Equal(blockId, blocksInDb[0].Id);
        Assert.Equal("<p>Nội dung mới của bài học</p>", blocksInDb[0].Body);
    }

    [Fact]
    public async Task SaveChapterDraft_WhenBaseVersionMismatch_ReturnsVersionConflict409()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Tiêu đề cũ", null, 1);
        chapter.UpdateDetails("Đã sửa bởi người khác", null);
        chapter.IncrementVersion(); // LastVersionNo is now 2
        await _repository.AddChapterAsync(chapter);

        SaveChapterDraftCommandHandler handler = new(_repository, _courseContract, _sanitizer);
        SaveChapterDraftCommand command = new(
            CourseId: CourseId,
            ChapterId: chapter.Id,
            RequesterUserId: OwnerUserId,
            BaseVersionNo: 1, // Client is holding outdated version 1
            Title: "Xung đột ghi đè",
            Description: null,
            Blocks: []);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.VersionConflict, result.Error.Code);
    }

    [Fact]
    public async Task SaveChapterDraft_WhenNotOwner_ReturnsForbidden()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương 1", null, 1);
        await _repository.AddChapterAsync(chapter);

        SaveChapterDraftCommandHandler handler = new(_repository, _courseContract, _sanitizer);
        SaveChapterDraftCommand command = new(
            CourseId: CourseId,
            ChapterId: chapter.Id,
            RequesterUserId: OtherUserId,
            BaseVersionNo: 1,
            Title: "Thử sửa",
            Description: null,
            Blocks: []);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.Forbidden, result.Error.Code);
    }

    [Fact]
    public async Task SaveChapterDraft_SnapshotSecurity_SnapshotMustNotContainAnswersOrOptions()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương kiểm tra bảo mật", null, 1);
        await _repository.AddChapterAsync(chapter);

        Guid blockId = Guid.NewGuid();
        Guid questionId = Guid.NewGuid();

        QuizConfigDto quizConfig = new(
            OpenAt: null,
            CloseAt: null,
            TimeLimitMinutes: 15,
            MaxAttempts: 1,
            PassScore: 5.0m,
            ResultDisplay: "IMMEDIATE_WITH_ANSWERS",
            ShuffleQuestions: false,
            ShuffleOptions: false,
            Password: null,
            HasPassword: false,
            Questions: [new QuizQuestionItemDto(QuestionId: questionId, Position: 1, Points: 10)],
            RandomRules: null,
            Prerequisites: null);

        BlockDto quizBlock = new(
            Id: blockId,
            BlockType: "QUIZ",
            Position: 1,
            Title: "Bài kiểm tra 15 phút",
            Body: null,
            ResourceId: null,
            QuestionId: null,
            Flashcards: null,
            AiReviewStatus: "NOT_APPLICABLE",
            QuizConfig: quizConfig,
            AssignmentConfig: null);

        SaveChapterDraftCommandHandler handler = new(_repository, _courseContract, _sanitizer);
        SaveChapterDraftCommand command = new(
            CourseId: CourseId,
            ChapterId: chapter.Id,
            RequesterUserId: OwnerUserId,
            BaseVersionNo: 1,
            Title: "Chương kiểm tra bảo mật",
            Description: null,
            Blocks: [quizBlock]);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);
        Assert.True(result.IsSuccess);

        ChapterVersion? version = await _repository.GetChapterVersionAsync(chapter.Id, 2);
        Assert.NotNull(version);

        // Security check: JSON snapshot schemaVersion=1 only has questionId, points, position, NO answer options or correct flags!
        string snapshot = version.Snapshot;
        Assert.Contains(questionId.ToString(), snapshot);
        Assert.DoesNotContain("is_correct", snapshot, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("isCorrect", snapshot, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("\"options\":[", snapshot, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("correctFeedback", snapshot, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SaveChapterDraft_HtmlSanitization_StripsScriptAndDangerousTags()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương XSS", null, 1);
        await _repository.AddChapterAsync(chapter);

        Guid blockId = Guid.NewGuid();
        BlockDto block = new(
            Id: blockId,
            BlockType: "RICH_TEXT",
            Position: 1,
            Title: null,
            Body: "<p>Nội dung</p><script>alert('hack')</script><img src=\"x\" onerror=\"alert(1)\"/>",
            ResourceId: null,
            QuestionId: null,
            Flashcards: null,
            AiReviewStatus: "NOT_APPLICABLE",
            QuizConfig: null,
            AssignmentConfig: null);

        SaveChapterDraftCommandHandler handler = new(_repository, _courseContract, _sanitizer);
        SaveChapterDraftCommand command = new(
            CourseId: CourseId,
            ChapterId: chapter.Id,
            RequesterUserId: OwnerUserId,
            BaseVersionNo: 1,
            Title: "Chương XSS",
            Description: null,
            Blocks: [block]);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);
        Assert.True(result.IsSuccess);

        IReadOnlyList<Block> blocksInDb = await _repository.GetBlocksByChapterIdAsync(chapter.Id);
        Assert.Single(blocksInDb);
        Assert.DoesNotContain("<script", blocksInDb[0].Body!, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("onerror", blocksInDb[0].Body!, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("<p>Nội dung</p>", blocksInDb[0].Body!);
    }

    [Theory]
    [InlineData("RICH_TEXT")]
    [InlineData("MARKDOWN")]
    public async Task SaveChapterDraft_WhenTextOrMarkdownEmpty_FailsValidation(string blockType)
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương 1", null, 1);
        await _repository.AddChapterAsync(chapter);

        BlockDto block = new(
            Id: Guid.NewGuid(),
            BlockType: blockType,
            Position: 1,
            Title: null,
            Body: "   ",
            ResourceId: null,
            QuestionId: null,
            Flashcards: null,
            AiReviewStatus: "NOT_APPLICABLE",
            QuizConfig: null,
            AssignmentConfig: null);

        SaveChapterDraftCommandHandler handler = new(_repository, _courseContract, _sanitizer);
        SaveChapterDraftCommand command = new(
            CourseId: CourseId,
            ChapterId: chapter.Id,
            RequesterUserId: OwnerUserId,
            BaseVersionNo: 1,
            Title: "Chương 1",
            Description: null,
            Blocks: [block]);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);
        Assert.True(result.IsFailure);
        Assert.Equal("BODY_REQUIRED", result.Error.Code);
    }

    [Theory]
    [InlineData("IMAGE")]
    [InlineData("FILE")]
    public async Task SaveChapterDraft_WhenImageOrFileMissingResourceId_FailsValidation(string blockType)
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương 1", null, 1);
        await _repository.AddChapterAsync(chapter);

        BlockDto block = new(
            Id: Guid.NewGuid(),
            BlockType: blockType,
            Position: 1,
            Title: null,
            Body: null,
            ResourceId: null,
            QuestionId: null,
            Flashcards: null,
            AiReviewStatus: "NOT_APPLICABLE",
            QuizConfig: null,
            AssignmentConfig: null);

        SaveChapterDraftCommandHandler handler = new(_repository, _courseContract, _sanitizer);
        SaveChapterDraftCommand command = new(
            CourseId: CourseId,
            ChapterId: chapter.Id,
            RequesterUserId: OwnerUserId,
            BaseVersionNo: 1,
            Title: "Chương 1",
            Description: null,
            Blocks: [block]);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);
        Assert.True(result.IsFailure);
        Assert.Equal("RESOURCE_REQUIRED", result.Error.Code);
    }

    #endregion

    #region GetChapterDraft & ListChapters

    [Fact]
    public async Task GetChapterDraft_WhenOwner_ReturnsDraftDetails()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Bản thảo chương", "Mô tả", 1);
        await _repository.AddChapterAsync(chapter);

        GetChapterDraftQueryHandler handler = new(_repository, _courseContract);
        GetChapterDraftQuery query = new(CourseId, chapter.Id, OwnerUserId);

        Result<ChapterDetailDto> result = await handler.Handle(query, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Bản thảo chương", result.Value.Title);
        Assert.Equal("DRAFT", result.Value.Status);
    }

    [Fact]
    public async Task GetChapterDraft_WhenNotOwner_ReturnsForbidden()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Bản thảo chương", "Mô tả", 1);
        await _repository.AddChapterAsync(chapter);

        GetChapterDraftQueryHandler handler = new(_repository, _courseContract);
        GetChapterDraftQuery query = new(CourseId, chapter.Id, OtherUserId);

        Result<ChapterDetailDto> result = await handler.Handle(query, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.Forbidden, result.Error.Code);
    }

    [Fact]
    public async Task ListChapters_WhenOwner_ReturnsBothDraftAndPublishedWithUnpublishedFlag()
    {
        Chapter c1 = new(Guid.NewGuid(), CourseId, "Chương nháp", null, 1);
        Chapter c2 = new(Guid.NewGuid(), CourseId, "Chương đã đăng", null, 2);
        c2.Publish(1, Now);
        c2.UpdateDetails("Chương đã đăng - có sửa đổi", null);
        c2.IncrementVersion(); // LastVersionNo = 2, PublishedVersionNo = 1 -> hasUnpublishedChanges = true

        await _repository.AddChapterAsync(c1);
        await _repository.AddChapterAsync(c2);

        ListChaptersQueryHandler handler = new(_repository, _courseContract);
        ListChaptersQuery query = new(CourseId, OwnerUserId);

        Result<IReadOnlyList<ChapterSummaryDto>> result = await handler.Handle(query, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Count);
        Assert.Equal("Chương nháp", result.Value[0].Title);
        Assert.True(result.Value[0].HasUnpublishedChanges);
        Assert.Equal("Chương đã đăng - có sửa đổi", result.Value[1].Title);
        Assert.True(result.Value[1].HasUnpublishedChanges);
    }

    [Fact]
    public async Task ListChapters_WhenAnonymousOrOtherUser_ReturnsOnlyPublishedChapters()
    {
        Chapter c1 = new(Guid.NewGuid(), CourseId, "Chương nháp bí mật", null, 1);
        Chapter c2 = new(Guid.NewGuid(), CourseId, "Chương đã đăng", null, 2);
        c2.Publish(1, Now);

        await _repository.AddChapterAsync(c1);
        await _repository.AddChapterAsync(c2);

        ListChaptersQueryHandler handler = new(_repository, _courseContract);
        ListChaptersQuery query = new(CourseId, OtherUserId);

        Result<IReadOnlyList<ChapterSummaryDto>> result = await handler.Handle(query, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Single(result.Value);
        Assert.Equal("Chương đã đăng", result.Value[0].Title);
    }

    #endregion
}
