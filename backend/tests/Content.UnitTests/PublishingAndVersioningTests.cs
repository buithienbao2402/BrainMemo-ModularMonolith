using System.Text.Json;
using BrainMemo.Content.Application.Commands.DeleteChapter;
using BrainMemo.Content.Application.Commands.PublishChapter;
using BrainMemo.Content.Application.Commands.RestoreChapterVersion;
using BrainMemo.Content.Application.Queries.ListChapterVersions;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Contracts.Events;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;
using BrainMemo.Content.Infrastructure.Contracts;
using BrainMemo.SharedKernel.Results;
using Xunit;

namespace Content.UnitTests;

public sealed class PublishingAndVersioningTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;
    private static readonly Guid CourseId = Guid.NewGuid();
    private static readonly Guid OwnerUserId = Guid.NewGuid();
    private static readonly Guid OtherUserId = Guid.NewGuid();

    private readonly FakeContentRepository _repository = new();
    private readonly FakeCourseContract _courseContract = new();
    private readonly FakeEventBus _eventBus = new();
    private readonly ContentContractService _contractService;

    public PublishingAndVersioningTests()
    {
        _courseContract.AddCourse(CourseId, OwnerUserId, accessMode: "PUBLIC", state: "ACTIVE");
        _contractService = new ContentContractService(_repository, _courseContract);
    }

    #region PublishChapter Tests

    [Fact]
    public async Task PublishChapter_WhenOwnerAndPrerequisitesMet_PublishesSuccessfullyAndDispatchesEvent()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương 1", "Mô tả chương 1", 1);
        await _repository.AddChapterAsync(chapter);

        Block block = new(Guid.NewGuid(), chapter.Id, BlockType.RichText, 1, "Bài học 1", "<p>Hello</p>");
        await _repository.ReplaceBlocksAsync(chapter.Id, [block]);

        PublishChapterCommandHandler handler = new(_repository, _courseContract, _eventBus);
        PublishChapterCommand command = new(CourseId, chapter.Id, OwnerUserId);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("PUBLISHED", result.Value.Status);
        Assert.Equal(1, result.Value.PublishedVersionNo);
        Assert.Equal(ChapterStatus.Published, chapter.Status);
        Assert.NotNull(chapter.FirstPublishedAt);

        // Verify published blocks generated
        var publishedBlocks = await _repository.GetPublishedBlocksByChapterIdAsync(chapter.Id);
        Assert.Single(publishedBlocks);
        Assert.Equal(block.Id, publishedBlocks[0].BlockId);

        // Verify ChapterPublished event
        Assert.Single(_eventBus.PublishedEvents);
        var pubEvent = Assert.IsType<ChapterPublished>(_eventBus.PublishedEvents[0]);
        Assert.Equal(chapter.Id, pubEvent.ChapterId);
        Assert.Equal(CourseId, pubEvent.CourseId);
        Assert.Equal(1, pubEvent.VersionNo);
        Assert.True(pubEvent.IsFirstPublish);
        Assert.Contains(block.Id, pubEvent.AddedBlockIds);
        Assert.Empty(pubEvent.RemovedBlockIds);
    }

    [Fact]
    public async Task PublishChapter_WhenEmptyChapter_PublishesSuccessfully()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương rỗng", null, 1);
        await _repository.AddChapterAsync(chapter);

        PublishChapterCommandHandler handler = new(_repository, _courseContract, _eventBus);
        PublishChapterCommand command = new(CourseId, chapter.Id, OwnerUserId);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(ChapterStatus.Published, chapter.Status);
        Assert.Single(_eventBus.PublishedEvents);
    }

    [Fact]
    public async Task PublishChapter_WhenAlreadyPublishedWithoutChanges_ReturnsCurrentDetailWithoutDuplicateEvent()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương 1", null, 1);
        chapter.Publish(1, Now);
        await _repository.AddChapterAsync(chapter);

        PublishChapterCommandHandler handler = new(_repository, _courseContract, _eventBus);
        PublishChapterCommand command = new(CourseId, chapter.Id, OwnerUserId);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Empty(_eventBus.PublishedEvents);
    }

    [Fact]
    public async Task PublishChapter_WhenFlashcardHasPendingAiReview_FailsWithChapterPublishBlocked()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương thẻ flashcard", null, 1);
        await _repository.AddChapterAsync(chapter);

        Block flashcardBlock = new(
            Guid.NewGuid(),
            chapter.Id,
            BlockType.Flashcard,
            1,
            "Flashcards",
            null,
            flashcards: "[{\"front\":\"Q1\",\"back\":\"A1\"}]",
            aiReviewStatus: AiReviewStatus.Pending);

        await _repository.ReplaceBlocksAsync(chapter.Id, [flashcardBlock]);

        PublishChapterCommandHandler handler = new(_repository, _courseContract, _eventBus);
        PublishChapterCommand command = new(CourseId, chapter.Id, OwnerUserId);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.ChapterPublishBlocked, result.Error.Code);
        Assert.Contains("PENDING", result.Error.Message);
        Assert.Empty(_eventBus.PublishedEvents);
    }

    [Fact]
    public async Task PublishChapter_WhenReferencedResourceDeleted_FailsWithChapterPublishBlocked()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương ảnh", null, 1);
        await _repository.AddChapterAsync(chapter);

        Resource res = new(Guid.NewGuid(), CourseId, ResourceKind.Image, "img.png", "image/png", 1000, "img-key");
        res.SoftDelete();
        await _repository.AddResourceAsync(res);

        Block imageBlock = new(Guid.NewGuid(), chapter.Id, BlockType.Image, 1, "Ảnh minh họa", null, resourceId: res.Id);
        await _repository.ReplaceBlocksAsync(chapter.Id, [imageBlock]);

        PublishChapterCommandHandler handler = new(_repository, _courseContract, _eventBus);
        PublishChapterCommand command = new(CourseId, chapter.Id, OwnerUserId);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.ChapterPublishBlocked, result.Error.Code);
        Assert.Contains("Tài nguyên", result.Error.Message);
    }

    [Fact]
    public async Task PublishChapter_WhenQuestionBlockRefersToNonExistentQuestion_FailsWithChapterPublishBlocked()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương câu hỏi", null, 1);
        await _repository.AddChapterAsync(chapter);

        Block qBlock = new(Guid.NewGuid(), chapter.Id, BlockType.Question, 1, "Câu 1", null, questionId: Guid.NewGuid());
        await _repository.ReplaceBlocksAsync(chapter.Id, [qBlock]);

        PublishChapterCommandHandler handler = new(_repository, _courseContract, _eventBus);
        PublishChapterCommand command = new(CourseId, chapter.Id, OwnerUserId);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.ChapterPublishBlocked, result.Error.Code);
        Assert.Contains("Câu hỏi", result.Error.Message);
    }

    [Fact]
    public async Task PublishChapter_WhenQuizHasInvalidOpenCloseTime_FailsWithChapterPublishBlocked()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương Quiz", null, 1);
        await _repository.AddChapterAsync(chapter);

        Block quizBlock = new(Guid.NewGuid(), chapter.Id, BlockType.Quiz, 1, "Bài thi cuối kỳ", null);
        await _repository.ReplaceBlocksAsync(chapter.Id, [quizBlock]);

        QuizConfig qc = new(quizBlock.Id, openAt: Now.AddDays(2), closeAt: Now.AddDays(1)); // Open after Close!
        await _repository.SaveQuizConfigAsync(qc, null, null, null);

        PublishChapterCommandHandler handler = new(_repository, _courseContract, _eventBus);
        PublishChapterCommand command = new(CourseId, chapter.Id, OwnerUserId);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.ChapterPublishBlocked, result.Error.Code);
        Assert.Contains("thời gian", result.Error.Message);
    }

    [Fact]
    public async Task PublishChapter_WhenQuizQuestionNotReady_FailsWithChapterPublishBlocked()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương Quiz", null, 1);
        await _repository.AddChapterAsync(chapter);

        Block quizBlock = new(Guid.NewGuid(), chapter.Id, BlockType.Quiz, 1, "Bài kiểm tra 15p", null);
        await _repository.ReplaceBlocksAsync(chapter.Id, [quizBlock]);

        QuestionBank bank = new(Guid.NewGuid(), CourseId);
        _repository.QuestionBanks.Add(bank);

        Question draftQuestion = new(Guid.NewGuid(), bank.Id, QuestionType.MultipleChoice, false, "Câu hỏi 1", null, null, null, 1, status: QuestionStatus.Draft);
        _repository.Questions.Add(draftQuestion);

        QuizConfig qc = new(quizBlock.Id);
        QuizQuestion qq = new(quizBlock.Id, draftQuestion.Id, 1, 10);
        await _repository.SaveQuizConfigAsync(qc, [qq], null, null);

        PublishChapterCommandHandler handler = new(_repository, _courseContract, _eventBus);
        PublishChapterCommand command = new(CourseId, chapter.Id, OwnerUserId);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.ChapterPublishBlocked, result.Error.Code);
        Assert.Contains("READY", result.Error.Message);
    }

    [Fact]
    public async Task PublishChapter_WhenQuizRandomRuleHasInsufficientQuestions_FailsWithChapterPublishBlocked()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương Quiz", null, 1);
        await _repository.AddChapterAsync(chapter);

        Block quizBlock = new(Guid.NewGuid(), chapter.Id, BlockType.Quiz, 1, "Bài thi ngẫu nhiên", null);
        await _repository.ReplaceBlocksAsync(chapter.Id, [quizBlock]);

        QuestionBank bank = new(Guid.NewGuid(), CourseId);
        _repository.QuestionBanks.Add(bank);

        // Bank only has 1 ready question
        Question q1 = new(Guid.NewGuid(), bank.Id, QuestionType.MultipleChoice, false, "Câu hỏi 1", null, null, null, 1, status: QuestionStatus.Ready);
        _repository.Questions.Add(q1);

        QuizConfig qc = new(quizBlock.Id);
        QuizRandomRule rule = new(Guid.NewGuid(), quizBlock.Id, 1, pickCount: 5, pointsEach: 2); // needs 5 questions!
        await _repository.SaveQuizConfigAsync(qc, null, [rule], null);

        PublishChapterCommandHandler handler = new(_repository, _courseContract, _eventBus);
        PublishChapterCommand command = new(CourseId, chapter.Id, OwnerUserId);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.ChapterPublishBlocked, result.Error.Code);
        Assert.Contains("5 câu hỏi", result.Error.Message);
    }

    [Fact]
    public async Task PublishChapter_WhenSecondPublish_CalculatesAddedAndRemovedBlocksCorrectly()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương 1", null, 1);
        await _repository.AddChapterAsync(chapter);

        Block blockA = new(Guid.NewGuid(), chapter.Id, BlockType.RichText, 1, "Block A", "<p>A</p>");
        Block blockB = new(Guid.NewGuid(), chapter.Id, BlockType.RichText, 2, "Block B", "<p>B</p>");
        await _repository.ReplaceBlocksAsync(chapter.Id, [blockA, blockB]);

        PublishChapterCommandHandler handler = new(_repository, _courseContract, _eventBus);

        // First publish
        await handler.Handle(new PublishChapterCommand(CourseId, chapter.Id, OwnerUserId), CancellationToken.None);

        // Increment version to 2 and update draft: remove blockA, keep blockB, add blockC
        chapter.IncrementVersion();
        Block blockC = new(Guid.NewGuid(), chapter.Id, BlockType.RichText, 2, "Block C", "<p>C</p>");
        await _repository.ReplaceBlocksAsync(chapter.Id, [blockB, blockC]);

        // Second publish
        Result<ChapterDetailDto> result2 = await handler.Handle(new PublishChapterCommand(CourseId, chapter.Id, OwnerUserId), CancellationToken.None);

        Assert.True(result2.IsSuccess);
        Assert.Equal(2, result2.Value.PublishedVersionNo);

        Assert.Equal(2, _eventBus.PublishedEvents.Count);
        var pubEvent2 = Assert.IsType<ChapterPublished>(_eventBus.PublishedEvents[1]);
        Assert.False(pubEvent2.IsFirstPublish);
        Assert.Equal(2, pubEvent2.VersionNo);
        Assert.Contains(blockC.Id, pubEvent2.AddedBlockIds);
        Assert.Contains(blockA.Id, pubEvent2.RemovedBlockIds);
    }

    [Fact]
    public async Task PublishChapter_WhenNotOwner_ReturnsForbidden()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương 1", null, 1);
        await _repository.AddChapterAsync(chapter);

        PublishChapterCommandHandler handler = new(_repository, _courseContract, _eventBus);
        PublishChapterCommand command = new(CourseId, chapter.Id, OtherUserId);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.Forbidden, result.Error.Code);
    }

    #endregion

    #region ListChapterVersions Tests

    [Fact]
    public async Task ListChapterVersions_WhenOwner_ReturnsPagedVersionsInDescendingOrder()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương phiên bản", null, 1);
        await _repository.AddChapterAsync(chapter);

        ChapterVersion v1 = new(Guid.NewGuid(), chapter.Id, 1, "{\"title\":\"v1\"}");
        ChapterVersion v2 = new(Guid.NewGuid(), chapter.Id, 2, "{\"title\":\"v2\"}");
        ChapterVersion v3 = new(Guid.NewGuid(), chapter.Id, 3, "{\"title\":\"v3\"}");
        await _repository.AddChapterVersionAsync(v1);
        await _repository.AddChapterVersionAsync(v2);
        await _repository.AddChapterVersionAsync(v3);

        ListChapterVersionsQueryHandler handler = new(_repository, _courseContract);
        ListChapterVersionsQuery query = new(CourseId, chapter.Id, OwnerUserId, Page: 1, PageSize: 2);

        Result<IReadOnlyList<ChapterVersionDto>> result = await handler.Handle(query, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Count);
        Assert.Equal(3, result.Value[0].VersionNo);
        Assert.Equal(2, result.Value[1].VersionNo);
    }

    [Fact]
    public async Task ListChapterVersions_WhenNotOwner_ReturnsForbidden()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương phiên bản", null, 1);
        await _repository.AddChapterAsync(chapter);

        ListChapterVersionsQueryHandler handler = new(_repository, _courseContract);
        ListChapterVersionsQuery query = new(CourseId, chapter.Id, OtherUserId);

        Result<IReadOnlyList<ChapterVersionDto>> result = await handler.Handle(query, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.Forbidden, result.Error.Code);
    }

    #endregion

    #region RestoreChapterVersion Tests

    [Fact]
    public async Task RestoreChapterVersion_WhenOwnerAndValidVersion_RestoresWorkingDraftAndCreatesNewVersionWithRestoredFrom()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương gốc", "Mô tả gốc", 1);
        await _repository.AddChapterAsync(chapter);

        Guid blockId = Guid.NewGuid();
        var snapshotV1 = new
        {
            schemaVersion = 1,
            title = "Chương khôi phục từ V1",
            description = "Mô tả khôi phục",
            blocks = new[]
            {
                new
                {
                    id = blockId,
                    blockType = "RICH_TEXT",
                    position = 1,
                    title = "Block 1",
                    body = "<p>Nội dung v1</p>",
                    resourceId = (Guid?)null,
                    questionId = (Guid?)null,
                    flashcards = (List<Flashcard>?)null,
                    aiReviewStatus = "NOT_APPLICABLE"
                }
            }
        };

        ChapterVersion v1 = new(Guid.NewGuid(), chapter.Id, 1, JsonSerializer.Serialize(snapshotV1));
        await _repository.AddChapterVersionAsync(v1);

        RestoreChapterVersionCommandHandler handler = new(_repository, _courseContract);
        RestoreChapterVersionCommand command = new(CourseId, chapter.Id, 1, OwnerUserId);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.LastVersionNo);
        Assert.Equal("Chương khôi phục từ V1", result.Value.Title);
        Assert.Equal("Mô tả khôi phục", result.Value.Description);

        // Verify draft blocks replaced
        var currentBlocks = await _repository.GetBlocksByChapterIdAsync(chapter.Id);
        Assert.Single(currentBlocks);
        Assert.Equal(blockId, currentBlocks[0].Id);
        Assert.Equal("<p>Nội dung v1</p>", currentBlocks[0].Body);

        // Verify new ChapterVersion record with RestoredFromVersionNo
        ChapterVersion? v2 = await _repository.GetChapterVersionAsync(chapter.Id, 2);
        Assert.NotNull(v2);
        Assert.Equal(1, v2.RestoredFromVersionNo);

        // Published status remains unaffected (§3.6.6.1: Khôi phục chỉ về bản nháp)
        Assert.Equal(ChapterStatus.Draft, chapter.Status);
        Assert.Null(chapter.PublishedVersionNo);
    }

    [Fact]
    public async Task RestoreChapterVersion_WhenReferencedResourceWasDeleted_FailsWithRestoreBlocked()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương ảnh", null, 1);
        await _repository.AddChapterAsync(chapter);

        Resource res = new(Guid.NewGuid(), CourseId, ResourceKind.Image, "old.png", "image/png", 500, "old-key");
        res.SoftDelete();
        await _repository.AddResourceAsync(res);

        var snapshotV1 = new
        {
            schemaVersion = 1,
            title = "Chương có ảnh",
            description = (string?)null,
            blocks = new[]
            {
                new
                {
                    id = Guid.NewGuid(),
                    blockType = "IMAGE",
                    position = 1,
                    title = "Ảnh cũ",
                    body = (string?)null,
                    resourceId = (Guid?)res.Id,
                    questionId = (Guid?)null,
                    flashcards = (List<Flashcard>?)null,
                    aiReviewStatus = "NOT_APPLICABLE"
                }
            }
        };

        ChapterVersion v1 = new(Guid.NewGuid(), chapter.Id, 1, JsonSerializer.Serialize(snapshotV1));
        await _repository.AddChapterVersionAsync(v1);

        RestoreChapterVersionCommandHandler handler = new(_repository, _courseContract);
        RestoreChapterVersionCommand command = new(CourseId, chapter.Id, 1, OwnerUserId);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("RESTORE_BLOCKED", result.Error.Code);
    }

    [Fact]
    public async Task RestoreChapterVersion_WhenVersionNotFound_ReturnsNotFound()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương 1", null, 1);
        await _repository.AddChapterAsync(chapter);

        RestoreChapterVersionCommandHandler handler = new(_repository, _courseContract);
        RestoreChapterVersionCommand command = new(CourseId, chapter.Id, 999, OwnerUserId);

        Result<ChapterDetailDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("VERSION_NOT_FOUND", result.Error.Code);
    }

    #endregion

    #region DeleteChapter Tests

    [Fact]
    public async Task DeleteChapter_WhenPublished_RemovesPublishedBlocksAndPublishesChapterDeletedEvent()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương đã xuất bản", null, 1);
        chapter.Publish(1, Now);
        await _repository.AddChapterAsync(chapter);

        PublishedBlock pb = new(Guid.NewGuid(), chapter.Id, BlockType.RichText, 1, null, null, 1);
        await _repository.ReplacePublishedBlocksAsync(chapter.Id, [pb]);

        DeleteChapterCommandHandler handler = new(_repository, _courseContract, _eventBus);
        DeleteChapterCommand command = new(CourseId, chapter.Id, OwnerUserId);

        Result result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(chapter.IsDeleted);

        // Verify published blocks cleaned up
        var remainingPubBlocks = await _repository.GetPublishedBlocksByChapterIdAsync(chapter.Id);
        Assert.Empty(remainingPubBlocks);

        // Verify ChapterDeleted event
        Assert.Single(_eventBus.PublishedEvents);
        var delEvent = Assert.IsType<ChapterDeleted>(_eventBus.PublishedEvents[0]);
        Assert.Equal(chapter.Id, delEvent.ChapterId);
        Assert.Equal(CourseId, delEvent.CourseId);
        Assert.True(delEvent.WasPublished);
    }

    [Fact]
    public async Task DeleteChapter_WhenDraft_PublishesChapterDeletedWithWasPublishedFalse()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương nháp", null, 1);
        await _repository.AddChapterAsync(chapter);

        DeleteChapterCommandHandler handler = new(_repository, _courseContract, _eventBus);
        DeleteChapterCommand command = new(CourseId, chapter.Id, OwnerUserId);

        Result result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Single(_eventBus.PublishedEvents);
        var delEvent = Assert.IsType<ChapterDeleted>(_eventBus.PublishedEvents[0]);
        Assert.False(delEvent.WasPublished);
    }

    #endregion

    #region Content Contract Queries Tests

    [Fact]
    public async Task GetPublishedChapterContent_WhenPublished_ReturnsContentWithoutAnswers()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương 1", "Mô tả chương 1", 1);
        chapter.Publish(1, Now);
        await _repository.AddChapterAsync(chapter);

        PublishedBlock pb = new(Guid.NewGuid(), chapter.Id, BlockType.RichText, 1, null, null, 1);
        await _repository.ReplacePublishedBlocksAsync(chapter.Id, [pb]);

        Result<PublishedChapterContentDto> result = _contractService.GetPublishedChapterContent(chapter.Id);

        Assert.True(result.IsSuccess);
        Assert.Equal(chapter.Id, result.Value.ChapterId);
        Assert.Equal(CourseId, result.Value.CourseId);
        Assert.Equal("Chương 1", result.Value.Title);
        Assert.Single(result.Value.Blocks);
        Assert.Equal(pb.BlockId, result.Value.Blocks[0].BlockId);
    }

    [Fact]
    public void GetPublishedChapterContent_WhenNotPublished_ReturnsNotFound()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương nháp", null, 1);
        _repository.Chapters.Add(chapter);

        Result<PublishedChapterContentDto> result = _contractService.GetPublishedChapterContent(chapter.Id);

        Assert.True(result.IsFailure);
        Assert.Equal("CHAPTER_NOT_FOUND", result.Error.Code);
    }

    [Fact]
    public async Task ListPublishedBlocks_ReturnsBlocksFilteredAndPaged()
    {
        Chapter c1 = new(Guid.NewGuid(), CourseId, "Chương 1", null, 1);
        c1.Publish(1, Now);
        await _repository.AddChapterAsync(c1);

        PublishedBlock b1 = new(Guid.NewGuid(), c1.Id, BlockType.RichText, 1, null, null, 1);
        PublishedBlock b2 = new(Guid.NewGuid(), c1.Id, BlockType.Video, 2, null, null, 1);
        PublishedBlock b3 = new(Guid.NewGuid(), c1.Id, BlockType.Markdown, 3, null, null, 1);
        await _repository.ReplacePublishedBlocksAsync(c1.Id, [b1, b2, b3]);

        Result<IReadOnlyList<PublishedBlockRef>> result = _contractService.ListPublishedBlocks(CourseId, c1.Id, afterId: b1.BlockId, limit: 1);

        Assert.True(result.IsSuccess);
        Assert.Single(result.Value);
        Assert.Equal(b2.BlockId, result.Value[0].BlockId);
    }

    [Fact]
    public async Task GetPublishedBlock_WhenExists_ReturnsPublishedBlockRef()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương 1", null, 1);
        chapter.Publish(1, Now);
        await _repository.AddChapterAsync(chapter);

        PublishedBlock pb = new(Guid.NewGuid(), chapter.Id, BlockType.RichText, 1, null, null, 1);
        await _repository.ReplacePublishedBlocksAsync(chapter.Id, [pb]);

        Result<PublishedBlockRef> result = _contractService.GetPublishedBlock(pb.BlockId);

        Assert.True(result.IsSuccess);
        Assert.Equal(pb.BlockId, result.Value.BlockId);
        Assert.Equal("RICHTEXT", result.Value.BlockType);
    }

    [Fact]
    public void GetPublishedBlock_WhenNotFound_ReturnsNotFound()
    {
        Result<PublishedBlockRef> result = _contractService.GetPublishedBlock(Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("BLOCK_NOT_FOUND", result.Error.Code);
    }

    #endregion
}
