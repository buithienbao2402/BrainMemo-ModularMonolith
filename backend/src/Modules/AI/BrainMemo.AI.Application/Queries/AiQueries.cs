using BrainMemo.AI.Application.Abstractions;
using BrainMemo.AI.Application.DTOs;
using BrainMemo.AI.Domain.Entities;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Settings;
using BrainMemo.Identity.Contracts;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.AI.Application.Queries;

public sealed record GetAiJobQuery(Guid JobId, Guid UserId, bool IsAdmin) : IQuery<AiJobDto>;

public sealed record GetAiQuotaQuery(Guid UserId) : IQuery<AiQuotaDto>;

public sealed record GetAdminSettingsQuery(Guid AdminUserId) : IQuery<SystemSettingsDto>;

public sealed class GetAiJobQueryHandler(
    IAiRepository aiRepository) : IQueryHandler<GetAiJobQuery, AiJobDto>
{
    public async Task<Result<AiJobDto>> Handle(GetAiJobQuery request, CancellationToken cancellationToken)
    {
        AiGenerationJob? job = await aiRepository.GetJobByIdAsync(request.JobId, cancellationToken);
        if (job is null)
        {
            return Result.Failure<AiJobDto>(new Error("JOB_NOT_FOUND", "Không tìm thấy job AI."));
        }

        if (job.UserId != request.UserId && !request.IsAdmin)
        {
            return Result.Failure<AiJobDto>(new Error("FORBIDDEN", "Bạn không có quyền truy cập job này."));
        }

        return Result.Success(new AiJobDto(
            job.Id,
            job.JobType.ToString().ToUpperInvariant(),
            job.Status.ToString().ToUpperInvariant(),
            job.ResultCount,
            job.ErrorMessage,
            job.CreatedAt,
            job.CompletedAt));
    }
}

public sealed class GetAiQuotaQueryHandler(
    IAiRepository aiRepository) : IQueryHandler<GetAiQuotaQuery, AiQuotaDto>
{
    public async Task<Result<AiQuotaDto>> Handle(GetAiQuotaQuery request, CancellationToken cancellationToken)
    {
        SystemSetting? quotaSetting = await aiRepository.GetSettingAsync(SystemSettingKeys.AiDailyQuota, cancellationToken);
        int limit = 20;
        if (quotaSetting is not null && int.TryParse(quotaSetting.Value, out int parsedLimit))
        {
            limit = parsedLimit;
        }

        DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow);
        AiUserDailyQuota quota = await aiRepository.GetOrCreateDailyQuotaAsync(request.UserId, today, limit, cancellationToken);
        int remaining = Math.Max(0, quota.QuotaLimit - quota.UsedCount);

        return Result.Success(new AiQuotaDto(quota.UsedCount, quota.QuotaLimit, remaining));
    }
}

public sealed class GetAdminSettingsQueryHandler(
    IAiRepository aiRepository,
    IIdentityContract identityContract) : IQueryHandler<GetAdminSettingsQuery, SystemSettingsDto>
{
    public async Task<Result<SystemSettingsDto>> Handle(GetAdminSettingsQuery request, CancellationToken cancellationToken)
    {
        Result<bool> adminCheck = await identityContract.IsAdmin(request.AdminUserId, cancellationToken);
        if (adminCheck.IsFailure || !adminCheck.Value)
        {
            return Result.Failure<SystemSettingsDto>(new Error("FORBIDDEN", "Chỉ quản trị viên mới có quyền xem cấu hình hệ thống."));
        }

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
