using System.Text;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Queries.Questions;

public sealed record ExportQuestionsResultDto(
    byte[] Content,
    string ContentType,
    string FileName);

public sealed record ExportQuestionsQuery(
    Guid CourseId,
    Guid RequesterUserId,
    string Format) : IQuery<ExportQuestionsResultDto>;

public sealed class ExportQuestionsQueryHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : IQueryHandler<ExportQuestionsQuery, ExportQuestionsResultDto>
{
    public async Task<Result<ExportQuestionsResultDto>> Handle(ExportQuestionsQuery request, CancellationToken cancellationToken)
    {
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.RequesterUserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure<ExportQuestionsResultDto>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure<ExportQuestionsResultDto>(new Error("FORBIDDEN", "Chỉ chủ khóa học mới có quyền xuất ngân hàng câu hỏi."));
        }

        var (questions, _) = await contentRepository.ListQuestionsAsync(
            request.CourseId,
            null,
            null,
            null,
            null,
            1,
            int.MaxValue,
            cancellationToken);

        var questionIds = questions.Select(q => q.Id).ToList();
        var optionsMap = await contentRepository.GetOptionsForQuestionsAsync(questionIds, cancellationToken);
        var tagsMap = await contentRepository.GetTagsForQuestionsAsync(questionIds, cancellationToken);

        var sb = new StringBuilder();
        sb.AppendLine("Type,Stem,AllowMultiple,Explanation,ReferenceAnswer,DifficultyCode,DefaultPoints,Tags,Options,Status");

        foreach (var q in questions)
        {
            optionsMap.TryGetValue(q.Id, out var options);
            options ??= Array.Empty<QuestionOption>();

            tagsMap.TryGetValue(q.Id, out var tags);
            tags ??= Array.Empty<string>();

            string tagsStr = string.Join(";", tags);
            string optionsStr = string.Join(";", options.OrderBy(o => o.Position).Select(o =>
                $"{EscapeOption(o.Content)}|{o.IsCorrect}|{EscapeOption(o.MatchContent ?? string.Empty)}|{o.BlankNo}"));

            sb.AppendLine(string.Join(",",
                EscapeCsv(q.QuestionType.ToString().ToUpperInvariant()),
                EscapeCsv(q.Stem),
                q.AllowMultiple,
                EscapeCsv(q.Explanation ?? string.Empty),
                EscapeCsv(q.ReferenceAnswer ?? string.Empty),
                q.DifficultyCode?.ToString() ?? string.Empty,
                q.DefaultPoints,
                EscapeCsv(tagsStr),
                EscapeCsv(optionsStr),
                EscapeCsv(q.Status.ToString().ToUpperInvariant())
            ));
        }

        byte[] bytes = Encoding.UTF8.GetBytes(sb.ToString());
        string contentType = "text/csv; charset=utf-8";
        string fileName = $"questions_{request.CourseId:N}.csv";

        return Result.Success(new ExportQuestionsResultDto(bytes, contentType, fileName));
    }

    private static string EscapeOption(string val) => val.Replace("|", "/").Replace(";", ",");

    private static string EscapeCsv(string val)
    {
        if (string.IsNullOrEmpty(val)) return "\"\"";
        return $"\"{val.Replace("\"", "\"\"")}\"";
    }
}
