using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Learning.Contracts;
using BrainMemo.Moderation.Application.Abstractions;
using BrainMemo.Moderation.Application.DTOs;
using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.Moderation.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using MediatR;
using CourseReportTarget = BrainMemo.Course.Contracts.Dtos.ReportTargetDto;
using LearningReportTarget = BrainMemo.Learning.Contracts.Dtos.ReportTargetDto;

namespace BrainMemo.Moderation.Application.Commands.CreateReport;

public sealed record CreateReportCommand(
    Guid ReporterUserId,
    CreateReportRequest Request) : IRequest<Result<Guid>>;

public sealed class CreateReportCommandHandler(
    IModerationRepository repository,
    ICourseContract courseContract,
    ILearningContract learningContract,
    IClock clock) : IRequestHandler<CreateReportCommand, Result<Guid>>
{
    public async Task<Result<Guid>> Handle(CreateReportCommand command, CancellationToken ct)
    {
        CreateReportRequest req = command.Request;
        DateTimeOffset utcNow = clock.UtcNow;

        if (!Enum.TryParse<ReportTargetType>(req.TargetType, true, out ReportTargetType targetType))
        {
            return Error.Validation("Loại đối tượng báo cáo không hợp lệ (chỉ hỗ trợ COURSE hoặc COMMENT).");
        }

        Guid targetCourseId;
        Guid targetOwnerUserId;
        string? targetSnapshot;

        if (targetType == ReportTargetType.Course)
        {
            Result<CourseReportTarget> resolveResult = courseContract.ResolveReportTarget(req.TargetId, command.ReporterUserId);
            if (resolveResult.IsFailure)
            {
                return resolveResult.Error;
            }

            if (!resolveResult.Value.CanBeReported)
            {
                return Error.NotFound("Khóa học không tồn tại hoặc bạn không có quyền truy cập.");
            }

            targetCourseId = resolveResult.Value.CourseId;
            targetOwnerUserId = resolveResult.Value.OwnerUserId;
            targetSnapshot = resolveResult.Value.CourseName;
        }
        else
        {
            Result<LearningReportTarget> resolveResult = learningContract.ResolveReportTarget(req.TargetId, command.ReporterUserId);
            if (resolveResult.IsFailure)
            {
                return resolveResult.Error;
            }

            targetCourseId = resolveResult.Value.CourseId;
            targetOwnerUserId = resolveResult.Value.AuthorUserId;
            targetSnapshot = resolveResult.Value.Content;
        }

        // Anti-duplicate check (FR-MOD-02)
        bool alreadyPending = await repository.HasPendingReportAsync(
            command.ReporterUserId,
            targetType,
            req.TargetId,
            ct).ConfigureAwait(false);

        if (alreadyPending)
        {
            return Error.Conflict(ErrorCodes.DuplicateReport, "Bạn đã có một báo cáo đang chờ xử lý cho đối tượng này.");
        }

        Guid reportId = Guid.NewGuid();
        Result<Report> createReportResult = Report.CreateUserReport(
            reportId,
            command.ReporterUserId,
            targetType,
            req.TargetId,
            targetCourseId,
            targetOwnerUserId,
            req.ReasonCode,
            req.Description,
            targetSnapshot,
            utcNow);

        if (createReportResult.IsFailure)
        {
            return createReportResult.Error;
        }

        Report report = createReportResult.Value;

        if (req.Evidence is not null && req.Evidence.Count > 0)
        {
            foreach (CreateReportEvidenceRequest ev in req.Evidence)
            {
                if (string.Equals(ev.Kind, "IMAGE", StringComparison.OrdinalIgnoreCase))
                {
                    if (string.IsNullOrWhiteSpace(ev.UploadKey)) continue;
                    Result<ReportEvidence> evResult = ReportEvidence.CreateImage(Guid.NewGuid(), reportId, ev.UploadKey, utcNow);
                    if (evResult.IsSuccess) report.AddEvidence(evResult.Value);
                }
                else if (string.Equals(ev.Kind, "LINK", StringComparison.OrdinalIgnoreCase))
                {
                    if (string.IsNullOrWhiteSpace(ev.Url)) continue;
                    Result<ReportEvidence> evResult = ReportEvidence.CreateLink(Guid.NewGuid(), reportId, ev.Url, utcNow);
                    if (evResult.IsSuccess) report.AddEvidence(evResult.Value);
                }
            }
        }

        await repository.AddReportAsync(report, ct).ConfigureAwait(false);
        await repository.SaveChangesAsync(ct).ConfigureAwait(false);

        return Result.Success(report.Id);
    }
}
