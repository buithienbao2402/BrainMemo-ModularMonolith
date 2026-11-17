using System.Text.Json;
using BrainMemo.AI.Application.Abstractions;
using BrainMemo.AI.Application.DTOs;
using BrainMemo.AI.Domain.Entities;
using BrainMemo.AI.Domain.Enums;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Settings;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Identity.Contracts;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.AI.Application.Commands;

public sealed record CreateQuizJobCommand(
    Guid CourseId,
    Guid UserId,
    string SourceKind,
    string? SourceText,
    Guid? SourceChapterId,
    int? Count,
    string? Difficulty,
    IReadOnlyList<string>? TypeFilter) : ICommand<AiJobDto>;

public sealed record CreateFlashcardJobCommand(
    Guid CourseId,
    Guid UserId,
    string SourceKind,
    string? SourceText,
    Guid? SourceChapterId,
    int? Count) : ICommand<AiJobDto>;

public sealed record UpdateAdminSettingsCommand(
    int? AiDailyQuota,
    string? AiLlmProvider,
    Guid AdminUserId) : ICommand<SystemSettingsDto>;

public sealed class CreateQuizJobCommandHandler(
    IAiRepository aiRepository,
    IAiJobQueue aiJobQueue,
    IIdentityContract identityContract,
    ICourseContract courseContract) : ICommandHandler<CreateQuizJobCommand, AiJobDto>
{
    public async Task<Result<AiJobDto>> Handle(CreateQuizJobCommand request, CancellationToken cancellationToken)
    {
        Result<AccountStatusDto> accountResult = await identityContract.GetAccountStatus(request.UserId, cancellationToken);
        if (accountResult.IsFailure)
        {
            return Result.Failure<AiJobDto>(accountResult.Error);
        }

        if (accountResult.Value.Status == "LOCKED")
        {
            return Result.Failure<AiJobDto>(new Error("ACCOUNT_LOCKED", "Tài khoản của bạn đang bị khóa."));
        }

        if (!accountResult.Value.EmailVerified)
        {
            return Result.Failure<AiJobDto>(new Error("EMAIL_NOT_VERIFIED", "Email chưa được xác minh."));
        }

        Result<Course.Contracts.Dtos.CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.UserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure<AiJobDto>(new Error("COURSE_NOT_FOUND", "Không tìm thấy khóa học."));
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure<AiJobDto>(new Error("FORBIDDEN", "Chỉ chủ khóa học mới có quyền sử dụng tính năng này."));
        }

        AiSourceKind sourceKind;
        string normalizedKind = request.SourceKind?.Replace("_", "").Trim().ToUpperInvariant() ?? "";
        if (normalizedKind == "PASTEDTEXT")
        {
            sourceKind = AiSourceKind.PastedText;
        }
        else if (normalizedKind == "CHAPTER")
        {
            sourceKind = AiSourceKind.Chapter;
        }
        else
        {
            return Result.Failure<AiJobDto>(new Error("INVALID_INPUT", "sourceKind không hợp lệ."));
        }

        if (sourceKind == AiSourceKind.PastedText)
        {
            if (string.IsNullOrWhiteSpace(request.SourceText))
            {
                return Result.Failure<AiJobDto>(new Error("INVALID_INPUT", "Văn bản nguồn không được để trống khi chọn PASTED_TEXT."));
            }

            if (request.SourceChapterId.HasValue)
            {
                return Result.Failure<AiJobDto>(new Error("INVALID_INPUT", "sourceChapterId phải là null khi chọn PASTED_TEXT."));
            }
        }
        else
        {
            if (!request.SourceChapterId.HasValue)
            {
                return Result.Failure<AiJobDto>(new Error("INVALID_INPUT", "sourceChapterId là bắt buộc khi chọn CHAPTER."));
            }

            if (!string.IsNullOrWhiteSpace(request.SourceText))
            {
                return Result.Failure<AiJobDto>(new Error("INVALID_INPUT", "sourceText phải là null khi chọn CHAPTER."));
            }
        }

        int count = request.Count.GetValueOrDefault(5);
        if (count < 1 || count > 30)
        {
            return Result.Failure<AiJobDto>(new Error("INVALID_INPUT", "Số lượng câu hỏi phải từ 1 đến 30."));
        }

        SystemSetting? quotaSetting = await aiRepository.GetSettingAsync(SystemSettingKeys.AiDailyQuota, cancellationToken);
        int limit = 20;
        if (quotaSetting is not null && int.TryParse(quotaSetting.Value, out int parsedLimit))
        {
            limit = parsedLimit;
        }

        DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow);
        bool quotaDeducted = await aiRepository.TryIncrementDailyQuotaAsync(request.UserId, today, limit, cancellationToken);
        if (!quotaDeducted)
        {
            return Result.Failure<AiJobDto>(new Error("AI_QUOTA_EXCEEDED", "Bạn đã sử dụng hết lượt gọi AI hôm nay."));
        }

        string genParams = JsonSerializer.Serialize(new
        {
            count,
            difficulty = request.Difficulty ?? "MEDIUM",
            typeFilter = request.TypeFilter ?? ["MULTIPLE_CHOICE"]
        });

        AiGenerationJob job = new(
            Guid.NewGuid(),
            request.UserId,
            request.CourseId,
            AiJobType.Quiz,
            sourceKind,
            request.SourceText,
            request.SourceChapterId,
            genParams,
            AiJobStatus.Pending);

        await aiRepository.AddJobAsync(job, cancellationToken);
        await aiRepository.SaveChangesAsync(cancellationToken);
        await aiJobQueue.EnqueueAsync(job.Id, cancellationToken);

        return Result.Success(new AiJobDto(
            job.Id,
            "QUIZ",
            "PENDING",
            null,
            null,
            job.CreatedAt,
            null));
    }
}

public sealed class CreateFlashcardJobCommandHandler(
    IAiRepository aiRepository,
    IAiJobQueue aiJobQueue,
    IIdentityContract identityContract,
    ICourseContract courseContract) : ICommandHandler<CreateFlashcardJobCommand, AiJobDto>
{
    public async Task<Result<AiJobDto>> Handle(CreateFlashcardJobCommand request, CancellationToken cancellationToken)
    {
        Result<AccountStatusDto> accountResult = await identityContract.GetAccountStatus(request.UserId, cancellationToken);
        if (accountResult.IsFailure)
        {
            return Result.Failure<AiJobDto>(accountResult.Error);
        }

        if (accountResult.Value.Status == "LOCKED")
        {
            return Result.Failure<AiJobDto>(new Error("ACCOUNT_LOCKED", "Tài khoản của bạn đang bị khóa."));
        }

        if (!accountResult.Value.EmailVerified)
        {
            return Result.Failure<AiJobDto>(new Error("EMAIL_NOT_VERIFIED", "Email chưa được xác minh."));
        }

        Result<Course.Contracts.Dtos.CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.UserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure<AiJobDto>(new Error("COURSE_NOT_FOUND", "Không tìm thấy khóa học."));
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure<AiJobDto>(new Error("FORBIDDEN", "Chỉ chủ khóa học mới có quyền sử dụng tính năng này."));
        }

        AiSourceKind sourceKind;
        string normalizedKind = request.SourceKind?.Replace("_", "").Trim().ToUpperInvariant() ?? "";
        if (normalizedKind == "PASTEDTEXT")
        {
            sourceKind = AiSourceKind.PastedText;
        }
        else if (normalizedKind == "CHAPTER")
        {
            sourceKind = AiSourceKind.Chapter;
        }
        else
        {
            return Result.Failure<AiJobDto>(new Error("INVALID_INPUT", "sourceKind không hợp lệ."));
        }

        if (!request.SourceChapterId.HasValue)
        {
            return Result.Failure<AiJobDto>(new Error("INVALID_INPUT", "sourceChapterId là bắt buộc để sinh flashcard cho chương."));
        }

        int count = request.Count.GetValueOrDefault(5);
        if (count < 1 || count > 30)
        {
            return Result.Failure<AiJobDto>(new Error("INVALID_INPUT", "Số lượng flashcard phải từ 1 đến 30."));
        }

        SystemSetting? quotaSetting = await aiRepository.GetSettingAsync(SystemSettingKeys.AiDailyQuota, cancellationToken);
        int limit = 20;
        if (quotaSetting is not null && int.TryParse(quotaSetting.Value, out int parsedLimit))
        {
            limit = parsedLimit;
        }

        DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow);
        bool quotaDeducted = await aiRepository.TryIncrementDailyQuotaAsync(request.UserId, today, limit, cancellationToken);
        if (!quotaDeducted)
        {
            return Result.Failure<AiJobDto>(new Error("AI_QUOTA_EXCEEDED", "Bạn đã sử dụng hết lượt gọi AI hôm nay."));
        }

        string genParams = JsonSerializer.Serialize(new
        {
            count
        });

        AiGenerationJob job = new(
            Guid.NewGuid(),
            request.UserId,
            request.CourseId,
            AiJobType.Flashcard,
            sourceKind,
            request.SourceText,
            request.SourceChapterId,
            genParams,
            AiJobStatus.Pending);

        await aiRepository.AddJobAsync(job, cancellationToken);
        await aiRepository.SaveChangesAsync(cancellationToken);
        await aiJobQueue.EnqueueAsync(job.Id, cancellationToken);

        return Result.Success(new AiJobDto(
            job.Id,
            "FLASHCARD",
            "PENDING",
            null,
            null,
            job.CreatedAt,
            null));
    }
}

public sealed class UpdateAdminSettingsCommandHandler(
    IAiRepository aiRepository,
    IIdentityContract identityContract) : ICommandHandler<UpdateAdminSettingsCommand, SystemSettingsDto>
{
    public async Task<Result<SystemSettingsDto>> Handle(UpdateAdminSettingsCommand request, CancellationToken cancellationToken)
    {
        Result<bool> adminCheck = await identityContract.IsAdmin(request.AdminUserId, cancellationToken);
        if (adminCheck.IsFailure || !adminCheck.Value)
        {
            return Result.Failure<SystemSettingsDto>(new Error("FORBIDDEN", "Chỉ quản trị viên mới có quyền cập nhật cấu hình hệ thống."));
        }

        if (request.AiDailyQuota.HasValue)
        {
            if (request.AiDailyQuota.Value < 0)
            {
                return Result.Failure<SystemSettingsDto>(new Error("INVALID_INPUT", "Hạn mức AI daily quota không được âm."));
            }

            await aiRepository.SetSettingAsync(
                SystemSettingKeys.AiDailyQuota,
                request.AiDailyQuota.Value.ToString(),
                request.AdminUserId,
                cancellationToken);
        }

        if (!string.IsNullOrWhiteSpace(request.AiLlmProvider))
        {
            string provider = request.AiLlmProvider.Trim().ToUpperInvariant();
            if (provider is not ("GEMINI" or "OPENAI" or "ANTHROPIC"))
            {
                return Result.Failure<SystemSettingsDto>(new Error("INVALID_INPUT", "Nhà cung cấp LLM không hợp lệ."));
            }

            await aiRepository.SetSettingAsync(
                SystemSettingKeys.AiLlmProvider,
                JsonSerializer.Serialize(provider),
                request.AdminUserId,
                cancellationToken);
        }

        await aiRepository.SaveChangesAsync(cancellationToken);

        SystemSetting? quotaSetting = await aiRepository.GetSettingAsync(SystemSettingKeys.AiDailyQuota, cancellationToken);
        SystemSetting? providerSetting = await aiRepository.GetSettingAsync(SystemSettingKeys.AiLlmProvider, cancellationToken);

        int currentQuota = 20;
        if (quotaSetting is not null && int.TryParse(quotaSetting.Value, out int qVal))
        {
            currentQuota = qVal;
        }

        string currentProvider = "GEMINI";
        if (providerSetting is not null)
        {
            currentProvider = providerSetting.Value.Trim('"');
        }

        return Result.Success(new SystemSettingsDto(currentQuota, currentProvider));
    }
}
