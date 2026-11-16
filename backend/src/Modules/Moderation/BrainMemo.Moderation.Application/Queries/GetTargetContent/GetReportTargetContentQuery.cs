using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Learning.Contracts;
using BrainMemo.Moderation.Application.Abstractions;
using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.Moderation.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using MediatR;

namespace BrainMemo.Moderation.Application.Queries.GetTargetContent;

public sealed record GetReportTargetContentQuery(
    Guid ReportId,
    Guid? ChapterId = null) : IRequest<Result<object>>;

public sealed class GetReportTargetContentQueryHandler(
    IModerationRepository repository,
    ICourseContract courseContract,
    ILearningContract learningContract) : IRequestHandler<GetReportTargetContentQuery, Result<object>>
{
    public async Task<Result<object>> Handle(GetReportTargetContentQuery query, CancellationToken ct)
    {
        Report? report = await repository.FindReportByIdAsync(query.ReportId, ct).ConfigureAwait(false);
        if (report is null)
        {
            return Error.NotFound("Không tìm thấy báo cáo.");
        }

        if (report.TargetType == ReportTargetType.Course)
        {
            var access = courseContract.GetCourseAccess(report.TargetCourseId, null, AccessPurpose.ModerationReview);
            if (access.IsFailure)
            {
                return access.Error;
            }

            if (string.Equals(access.Value.AccessMode, "ONLY_ME", StringComparison.OrdinalIgnoreCase))
            {
                return Error.NotFound("Khóa học Only Me không cho phép xem trước nội dung kiểm duyệt.");
            }

            var summaries = courseContract.GetCourseSummaries([report.TargetCourseId], null);
            var summary = summaries.IsSuccess && summaries.Value.Count > 0 ? summaries.Value[0] : null;

            return Result.Success<object>(new
            {
                targetType = "COURSE",
                courseId = report.TargetCourseId,
                name = summary?.Name ?? report.TargetSnapshot,
                description = summary?.Description,
                accessMode = access.Value.AccessMode,
                effectiveState = access.Value.EffectiveState,
                canReadContent = access.Value.CanReadContent,
                tags = summary?.Tags ?? [],
            });
        }
        else
        {
            var commentTarget = learningContract.ResolveReportTarget(report.TargetId, Guid.Empty);
            if (commentTarget.IsFailure)
            {
                return Result.Success<object>(new
                {
                    targetType = "COMMENT",
                    commentId = report.TargetId,
                    content = report.TargetSnapshot,
                });
            }

            return Result.Success<object>(new
            {
                targetType = "COMMENT",
                commentId = commentTarget.Value.CommentId,
                courseId = commentTarget.Value.CourseId,
                chapterId = commentTarget.Value.ChapterId,
                authorUserId = commentTarget.Value.AuthorUserId,
                content = commentTarget.Value.Content,
            });
        }
    }
}
