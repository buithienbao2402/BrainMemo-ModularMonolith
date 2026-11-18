using System.Text;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Application.DTOs;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Commands.Questions;

public sealed record ImportQuestionsCommand(
    Guid CourseId,
    Guid RequesterUserId,
    Stream FileStream,
    string FileName) : ICommand<ImportQuestionsResultDto>;

public sealed class ImportQuestionsCommandHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : ICommandHandler<ImportQuestionsCommand, ImportQuestionsResultDto>
{
    public async Task<Result<ImportQuestionsResultDto>> Handle(ImportQuestionsCommand request, CancellationToken cancellationToken)
    {
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.RequesterUserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure<ImportQuestionsResultDto>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure<ImportQuestionsResultDto>(new Error("FORBIDDEN", "Chỉ chủ khóa học mới có quyền nhập câu hỏi."));
        }

        var bank = await contentRepository.GetQuestionBankByCourseIdAsync(request.CourseId, cancellationToken);
        if (bank is null)
        {
            bank = new QuestionBank(Guid.NewGuid(), request.CourseId);
            await contentRepository.AddQuestionBankAsync(bank, cancellationToken);
            await contentRepository.SaveChangesAsync(cancellationToken);
        }

        using var reader = new StreamReader(request.FileStream, Encoding.UTF8);
        var errors = new List<ImportRowErrorDto>();
        int imported = 0;
        int rowNumber = 0;

        string? line;
        while ((line = await reader.ReadLineAsync(cancellationToken)) != null)
        {
            rowNumber++;
            if (rowNumber == 1)
            {
                // Header row
                continue;
            }

            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            var parts = ParseCsvLine(line);
            if (parts.Count < 2)
            {
                errors.Add(new ImportRowErrorDto(rowNumber, "Dòng không đủ số cột yêu cầu."));
                continue;
            }

            // Expected cols: Type, Stem, AllowMultiple, Explanation, ReferenceAnswer, DifficultyCode, DefaultPoints, Tags, Options
            string typeStr = parts[0].Trim();
            if (!Enum.TryParse<QuestionType>(typeStr, true, out var questionType))
            {
                errors.Add(new ImportRowErrorDto(rowNumber, $"Loại câu hỏi '{typeStr}' không hợp lệ."));
                continue;
            }

            string stem = parts[1].Trim();
            if (string.IsNullOrWhiteSpace(stem))
            {
                errors.Add(new ImportRowErrorDto(rowNumber, "Nội dung câu hỏi (stem) không được để trống."));
                continue;
            }

            bool allowMultiple = parts.Count > 2 && bool.TryParse(parts[2].Trim(), out var am) && am;
            string? explanation = parts.Count > 3 && !string.IsNullOrWhiteSpace(parts[3]) ? parts[3].Trim() : null;
            string? referenceAnswer = parts.Count > 4 && !string.IsNullOrWhiteSpace(parts[4]) ? parts[4].Trim() : null;
            byte? difficultyCode = parts.Count > 5 && byte.TryParse(parts[5].Trim(), out var dc) ? dc : null;
            decimal defaultPoints = parts.Count > 6 && decimal.TryParse(parts[6].Trim(), out var dp) ? dp : 1.0m;

            var tags = parts.Count > 7 && !string.IsNullOrWhiteSpace(parts[7])
                ? parts[7].Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                : Array.Empty<string>();

            // Options: format "OptionContent|isCorrect;OptionContent2|isCorrect" or remainder cols
            var options = new List<QuestionOption>();
            Guid questionId = Guid.NewGuid();

            if (parts.Count > 8 && !string.IsNullOrWhiteSpace(parts[8]))
            {
                string rawOptions = parts[8].Trim();
                var optEntries = rawOptions.Split(';', StringSplitOptions.RemoveEmptyEntries);
                ushort pos = 1;
                foreach (var entry in optEntries)
                {
                    var segs = entry.Split('|');
                    string optContent = segs[0].Trim();
                    bool isCorrect = segs.Length > 1 && bool.TryParse(segs[1].Trim(), out var ic) && ic;
                    string? matchContent = segs.Length > 2 ? segs[2].Trim() : null;
                    byte? blankNo = segs.Length > 3 && byte.TryParse(segs[3].Trim(), out var bn) ? bn : null;

                    options.Add(new QuestionOption(Guid.NewGuid(), questionId, pos++, optContent, matchContent, blankNo, isCorrect));
                }
            }

            var question = new Question(
                questionId,
                bank.Id,
                questionType,
                allowMultiple,
                stem,
                explanation,
                referenceAnswer,
                difficultyCode,
                defaultPoints,
                QuestionStatus.Draft,
                QuestionOrigin.Manual);

            await contentRepository.AddQuestionWithOptionsAndTagsAsync(question, options, tags, cancellationToken);
            imported++;
        }

        if (imported > 0)
        {
            await contentRepository.SaveChangesAsync(cancellationToken);
        }

        return Result.Success(new ImportQuestionsResultDto(imported, errors));
    }

    private static List<string> ParseCsvLine(string line)
    {
        var result = new List<string>();
        bool inQuotes = false;
        var sb = new StringBuilder();

        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];
            if (c == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    sb.Append('"');
                    i++;
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if (c == ',' && !inQuotes)
            {
                result.Add(sb.ToString());
                sb.Clear();
            }
            else
            {
                sb.Append(c);
            }
        }
        result.Add(sb.ToString());
        return result;
    }
}
