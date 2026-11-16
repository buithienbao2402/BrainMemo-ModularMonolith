using System.Text;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Application.Commands.Questions;
using BrainMemo.Content.Application.DTOs;
using BrainMemo.Content.Application.Queries.Questions;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;
using BrainMemo.Content.Domain.Services;
using BrainMemo.Content.Infrastructure.Contracts;
using BrainMemo.Content.Infrastructure.Security;
using BrainMemo.SharedKernel.Results;
using Xunit;

namespace Content.UnitTests;

public class QuestionBankAndQuizAuthoringTests
{
    private readonly FakeContentRepository _repo = new();
    private readonly FakeCourseContract _courseContract = new();
    private readonly BCryptQuizPasswordHasher _passwordHasher = new();
    private readonly Guid _courseId = Guid.NewGuid();
    private readonly Guid _ownerId = Guid.NewGuid();

    public QuestionBankAndQuizAuthoringTests()
    {
        _courseContract.AddCourse(_courseId, _ownerId, "PUBLIC", "ACTIVE");
        _repo.QuestionBanks.Add(new QuestionBank(Guid.NewGuid(), _courseId));
    }

    [Fact]
    public void QuestionValidator_MultipleChoice_SingleChoice_RequiresExactlyOneCorrect()
    {
        Guid qId = Guid.NewGuid();
        var opt1 = new QuestionOption(Guid.NewGuid(), qId, 1, "A", isCorrect: true);
        var opt2 = new QuestionOption(Guid.NewGuid(), qId, 2, "B", isCorrect: true);

        // 2 correct for single choice -> fail
        var resultFail = QuestionValidator.ValidateForReady(QuestionType.MultipleChoice, false, "Câu 1", null, null, [opt1, opt2]);
        Assert.True(resultFail.IsFailure);
        Assert.Equal("INVALID_STATE", resultFail.Error.Code);

        // 1 correct for single choice -> pass
        var opt2False = new QuestionOption(Guid.NewGuid(), qId, 2, "B", isCorrect: false);
        var resultPass = QuestionValidator.ValidateForReady(QuestionType.MultipleChoice, false, "Câu 1", null, null, [opt1, opt2False]);
        Assert.True(resultPass.IsSuccess);
    }

    [Fact]
    public void QuestionValidator_MultipleChoice_MultipleChoice_RequiresAtLeastOneCorrect()
    {
        Guid qId = Guid.NewGuid();
        var opt1 = new QuestionOption(Guid.NewGuid(), qId, 1, "A", isCorrect: false);
        var opt2 = new QuestionOption(Guid.NewGuid(), qId, 2, "B", isCorrect: false);

        // 0 correct -> fail
        var resultFail = QuestionValidator.ValidateForReady(QuestionType.MultipleChoice, true, "Câu 1", null, null, [opt1, opt2]);
        Assert.True(resultFail.IsFailure);

        // 2 correct -> pass
        var opt1Correct = new QuestionOption(Guid.NewGuid(), qId, 1, "A", isCorrect: true);
        var opt2Correct = new QuestionOption(Guid.NewGuid(), qId, 2, "B", isCorrect: true);
        var resultPass = QuestionValidator.ValidateForReady(QuestionType.MultipleChoice, true, "Câu 1", null, null, [opt1Correct, opt2Correct]);
        Assert.True(resultPass.IsSuccess);
    }

    [Fact]
    public void QuestionValidator_TrueFalse_RequiresExactlyTwoOptionsAndOneCorrect()
    {
        Guid qId = Guid.NewGuid();
        var opt1 = new QuestionOption(Guid.NewGuid(), qId, 1, "Đúng", isCorrect: true);
        var opt2 = new QuestionOption(Guid.NewGuid(), qId, 2, "Sai", isCorrect: true);

        // 2 correct -> fail
        var resultFail = QuestionValidator.ValidateForReady(QuestionType.TrueFalse, false, "Câu TF", null, null, [opt1, opt2]);
        Assert.True(resultFail.IsFailure);

        // Only 1 option -> fail
        var resultOneOpt = QuestionValidator.ValidateForReady(QuestionType.TrueFalse, false, "Câu TF", null, null, [opt1]);
        Assert.True(resultOneOpt.IsFailure);

        // 1 correct -> pass
        var opt2False = new QuestionOption(Guid.NewGuid(), qId, 2, "Sai", isCorrect: false);
        var resultPass = QuestionValidator.ValidateForReady(QuestionType.TrueFalse, false, "Câu TF", null, null, [opt1, opt2False]);
        Assert.True(resultPass.IsSuccess);
    }

    [Fact]
    public void QuestionValidator_FillBlank_RequiresBlankNoAndContent()
    {
        Guid qId = Guid.NewGuid();
        var invalidOpt = new QuestionOption(Guid.NewGuid(), qId, 1, "", blankNo: null);

        var resultFail = QuestionValidator.ValidateForReady(QuestionType.FillBlank, false, "Câu điền khuyết", null, null, [invalidOpt]);
        Assert.True(resultFail.IsFailure);

        var validOpt = new QuestionOption(Guid.NewGuid(), qId, 1, "đáp án", blankNo: 1);
        var resultPass = QuestionValidator.ValidateForReady(QuestionType.FillBlank, false, "Câu điền khuyết", null, null, [validOpt]);
        Assert.True(resultPass.IsSuccess);
    }

    [Fact]
    public void QuestionValidator_Matching_RequiresContentAndMatchContent()
    {
        Guid qId = Guid.NewGuid();
        var opt1 = new QuestionOption(Guid.NewGuid(), qId, 1, "Trái 1", matchContent: null);
        var opt2 = new QuestionOption(Guid.NewGuid(), qId, 2, "Trái 2", matchContent: "Phải 2");

        var resultFail = QuestionValidator.ValidateForReady(QuestionType.Matching, false, "Câu nối cặp", null, null, [opt1, opt2]);
        Assert.True(resultFail.IsFailure);

        var opt1Valid = new QuestionOption(Guid.NewGuid(), qId, 1, "Trái 1", matchContent: "Phải 1");
        var resultPass = QuestionValidator.ValidateForReady(QuestionType.Matching, false, "Câu nối cặp", null, null, [opt1Valid, opt2]);
        Assert.True(resultPass.IsSuccess);
    }

    [Fact]
    public void QuestionValidator_Essay_RequiresReferenceAnswerOrExplanation()
    {
        var resultFail = QuestionValidator.ValidateForReady(QuestionType.Essay, false, "Câu tự luận", null, null, []);
        Assert.True(resultFail.IsFailure);

        var resultPassWithRef = QuestionValidator.ValidateForReady(QuestionType.Essay, false, "Câu tự luận", null, "Đáp án mẫu", []);
        Assert.True(resultPassWithRef.IsSuccess);

        var resultPassWithExp = QuestionValidator.ValidateForReady(QuestionType.Essay, false, "Câu tự luận", "Giải thích", null, []);
        Assert.True(resultPassWithExp.IsSuccess);
    }

    [Fact]
    public async Task CreateQuestion_And_SetQuestionStatus_ValidatesReady()
    {
        var createHandler = new CreateQuestionCommandHandler(_repo, _courseContract);
        var createCmd = new CreateQuestionCommand(
            _courseId,
            _ownerId,
            new QuestionUpsertDto(
                "MultipleChoice",
                false,
                "Thủ đô của Việt Nam là gì?",
                "Hà Nội là thủ đô",
                null,
                1,
                1.0m,
                ["dia-ly", "co-ban"],
                [
                    new QuestionOptionUpsertDto(null, 1, "Hà Nội", null, null, true),
                    new QuestionOptionUpsertDto(null, 2, "TP.HCM", null, null, false)
                ]));

        var createResult = await createHandler.Handle(createCmd, CancellationToken.None);
        Assert.True(createResult.IsSuccess);
        Assert.Equal("DRAFT", createResult.Value.Status);

        // Transition to READY
        var statusHandler = new SetQuestionStatusCommandHandler(_repo, _courseContract);
        var statusCmd = new SetQuestionStatusCommand(_courseId, createResult.Value.Id, _ownerId, "READY");
        var statusResult = await statusHandler.Handle(statusCmd, CancellationToken.None);
        Assert.True(statusResult.IsSuccess);

        var updatedQ = await _repo.GetQuestionByIdAsync(createResult.Value.Id);
        Assert.NotNull(updatedQ);
        Assert.Equal(QuestionStatus.Ready, updatedQ.Status);
    }

    [Fact]
    public async Task SetQuestionStatus_ToReady_FailsIfInvalid()
    {
        var createHandler = new CreateQuestionCommandHandler(_repo, _courseContract);
        // Invalid MultipleChoice: 0 correct options
        var createCmd = new CreateQuestionCommand(
            _courseId,
            _ownerId,
            new QuestionUpsertDto(
                "MultipleChoice",
                false,
                "Câu hỏi chưa có đáp án đúng",
                null,
                null,
                null,
                1.0m,
                null,
                [
                    new QuestionOptionUpsertDto(null, 1, "A", null, null, false),
                    new QuestionOptionUpsertDto(null, 2, "B", null, null, false)
                ]));

        var createResult = await createHandler.Handle(createCmd, CancellationToken.None);
        Assert.True(createResult.IsSuccess);

        var statusHandler = new SetQuestionStatusCommandHandler(_repo, _courseContract);
        var statusCmd = new SetQuestionStatusCommand(_courseId, createResult.Value.Id, _ownerId, "READY");
        var statusResult = await statusHandler.Handle(statusCmd, CancellationToken.None);

        Assert.True(statusResult.IsFailure);
        Assert.Equal("INVALID_STATE", statusResult.Error.Code);
    }

    [Fact]
    public async Task ImportQuestions_ParsesCsv_ReportsErrorsAndImportsValidRows()
    {
        string csv = @"Type,Stem,AllowMultiple,Explanation,ReferenceAnswer,DifficultyCode,DefaultPoints,Tags,Options
MultipleChoice,Hà Nội là thủ đô nước nào?,false,Việt Nam,,1,1,dia-ly,Việt Nam|true;Lào|false
InvalidType,Câu lỗi,,,,,,
MultipleChoice,,false,,,,,";

        byte[] bytes = Encoding.UTF8.GetBytes(csv);
        using var stream = new MemoryStream(bytes);

        var handler = new ImportQuestionsCommandHandler(_repo, _courseContract);
        var cmd = new ImportQuestionsCommand(_courseId, _ownerId, stream, "test.csv");

        var result = await handler.Handle(cmd, CancellationToken.None);
        Assert.True(result.IsSuccess);
        Assert.Equal(1, result.Value.Imported);
        Assert.Equal(2, result.Value.Errors.Count);
        Assert.Equal(3, result.Value.Errors[0].Row);
        Assert.Equal(4, result.Value.Errors[1].Row);
    }

    [Fact]
    public async Task ExportQuestions_GeneratesCsvContent()
    {
        var bank = _repo.QuestionBanks.First(b => b.CourseId == _courseId);
        var q = new Question(Guid.NewGuid(), bank.Id, QuestionType.MultipleChoice, false, "Câu test xuất", null, null, 1, 2.0m, QuestionStatus.Ready);
        var opt1 = new QuestionOption(Guid.NewGuid(), q.Id, 1, "A", isCorrect: true);
        var opt2 = new QuestionOption(Guid.NewGuid(), q.Id, 2, "B", isCorrect: false);
        await _repo.AddQuestionWithOptionsAndTagsAsync(q, [opt1, opt2], ["test-tag"]);

        var handler = new ExportQuestionsQueryHandler(_repo, _courseContract);
        var query = new ExportQuestionsQuery(_courseId, _ownerId, "csv");
        var result = await handler.Handle(query, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotEmpty(result.Value.Content);
        string csvText = Encoding.UTF8.GetString(result.Value.Content);
        Assert.Contains("Câu test xuất", csvText);
        Assert.Contains("test-tag", csvText);
    }

    [Fact]
    public async Task QuizExceptions_Upsert_List_Delete_Flow()
    {
        Guid quizBlockId = Guid.NewGuid();
        Guid studentId = Guid.NewGuid();
        _repo.QuizConfigs.Add(new QuizConfig(quizBlockId));

        var upsertHandler = new UpsertQuizExceptionCommandHandler(_repo, _courseContract);
        var upsertCmd = new UpsertQuizExceptionCommand(
            _courseId,
            quizBlockId,
            studentId,
            _ownerId,
            new QuizExceptionUpsertDto(ExtraMinutes: 30, ExtraAttempts: 2, ExtendedCloseAt: null));

        var upsertResult = await upsertHandler.Handle(upsertCmd, CancellationToken.None);
        Assert.True(upsertResult.IsSuccess);

        var listHandler = new ListQuizExceptionsQueryHandler(_repo, _courseContract);
        var listQuery = new ListQuizExceptionsQuery(_courseId, quizBlockId, _ownerId);
        var listResult = await listHandler.Handle(listQuery, CancellationToken.None);

        Assert.True(listResult.IsSuccess);
        Assert.Single(listResult.Value);
        Assert.Equal(30, listResult.Value[0].ExtraMinutes);
        Assert.Equal(2, listResult.Value[0].ExtraAttempts);

        // Delete exception
        var deleteHandler = new DeleteQuizExceptionCommandHandler(_repo, _courseContract);
        var deleteCmd = new DeleteQuizExceptionCommand(_courseId, quizBlockId, studentId, _ownerId);
        var deleteResult = await deleteHandler.Handle(deleteCmd, CancellationToken.None);
        Assert.True(deleteResult.IsSuccess);

        var listResultAfterDelete = await listHandler.Handle(listQuery, CancellationToken.None);
        Assert.Empty(listResultAfterDelete.Value);
    }

    [Fact]
    public void VerifyQuizPassword_ChecksBCryptHash()
    {
        Guid quizBlockId = Guid.NewGuid();
        string rawPassword = "ExamPassword@2026";
        string hash = _passwordHasher.Hash(rawPassword);

        _repo.QuizConfigs.Add(new QuizConfig(quizBlockId, passwordHash: hash));
        var contractService = new ContentContractService(_repo, _courseContract, _passwordHasher);

        // Wrong password fails
        var failResult = contractService.VerifyQuizPassword(quizBlockId, "WrongPass");
        Assert.True(failResult.IsFailure);
        Assert.Equal("QUIZ_PASSWORD_INVALID", failResult.Error.Code);

        // Correct password succeeds
        var passResult = contractService.VerifyQuizPassword(quizBlockId, rawPassword);
        Assert.True(passResult.IsSuccess);
    }

    [Fact]
    public void DrawQuizQuestions_ReturnsNotEnoughQuestions_WhenPoolSmallerThanPickCount()
    {
        Guid quizBlockId = Guid.NewGuid();
        Guid chapterId = Guid.NewGuid();
        _repo.Chapters.Add(new Chapter(chapterId, _courseId, "Chương 1", null, 1));
        _repo.PublishedBlocks.Add(new PublishedBlock(quizBlockId, chapterId, BlockType.Quiz, 1, null, null, 1));
        _repo.QuizConfigs.Add(new QuizConfig(quizBlockId));

        // Rule requires 5 questions, but pool has only 1 READY question
        var rule = new QuizRandomRule(Guid.NewGuid(), quizBlockId, 1, pickCount: 5, pointsEach: 2.0m);
        _repo.QuizRandomRules.Add(rule);

        var bank = _repo.QuestionBanks.First(b => b.CourseId == _courseId);
        var q1 = new Question(Guid.NewGuid(), bank.Id, QuestionType.MultipleChoice, false, "Q1", null, null, null, 2.0m, QuestionStatus.Ready);
        _repo.Questions.Add(q1);

        var contractService = new ContentContractService(_repo, _courseContract, _passwordHasher);
        var drawResult = contractService.DrawQuizQuestions(quizBlockId);

        Assert.True(drawResult.IsFailure);
        Assert.Equal("NOT_ENOUGH_QUESTIONS", drawResult.Error.Code);
    }

    [Fact]
    public void DrawQuizQuestions_PicksUniqueQuestions_PreservesManualAndRuleOrder()
    {
        Guid quizBlockId = Guid.NewGuid();
        Guid chapterId = Guid.NewGuid();
        _repo.Chapters.Add(new Chapter(chapterId, _courseId, "Chương 1", null, 1));
        _repo.PublishedBlocks.Add(new PublishedBlock(quizBlockId, chapterId, BlockType.Quiz, 1, null, null, 1));
        _repo.QuizConfigs.Add(new QuizConfig(quizBlockId));

        var bank = _repo.QuestionBanks.First(b => b.CourseId == _courseId);

        // Manual question
        var manualQ = new Question(Guid.NewGuid(), bank.Id, QuestionType.MultipleChoice, false, "Manual Q", null, null, null, 2.0m, QuestionStatus.Ready);
        _repo.Questions.Add(manualQ);
        _repo.QuizQuestions.Add(new QuizQuestion(quizBlockId, manualQ.Id, 1, 2.0m));

        // Candidate pool for rule
        var ruleQ1 = new Question(Guid.NewGuid(), bank.Id, QuestionType.MultipleChoice, false, "Rule Q1", null, null, null, 2.0m, QuestionStatus.Ready);
        var ruleQ2 = new Question(Guid.NewGuid(), bank.Id, QuestionType.MultipleChoice, false, "Rule Q2", null, null, null, 2.0m, QuestionStatus.Ready);
        _repo.Questions.AddRange([ruleQ1, ruleQ2]);

        // Rule picks 2 questions
        var rule = new QuizRandomRule(Guid.NewGuid(), quizBlockId, 2, pickCount: 2, pointsEach: 2.0m);
        _repo.QuizRandomRules.Add(rule);

        var contractService = new ContentContractService(_repo, _courseContract, _passwordHasher);
        var drawResult = contractService.DrawQuizQuestions(quizBlockId);

        Assert.True(drawResult.IsSuccess);
        Assert.Equal(3, drawResult.Value.QuestionIds.Count);
        // Manual question is first
        Assert.Equal(manualQ.Id, drawResult.Value.QuestionIds[0]);
        // No duplicates
        Assert.Equal(3, drawResult.Value.QuestionIds.Distinct().Count());
    }
}
