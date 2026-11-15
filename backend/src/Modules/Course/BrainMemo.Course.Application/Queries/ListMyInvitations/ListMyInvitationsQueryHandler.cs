using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Application.Common;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Queries.ListMyInvitations;

public sealed class ListMyInvitationsQueryHandler(
    ICourseRepository courseRepository,
    IProfileContract? profileContract = null) : IQueryHandler<ListMyInvitationsQuery, IReadOnlyList<CourseCardDto>>
{
    public async Task<Result<IReadOnlyList<CourseCardDto>>> Handle(ListMyInvitationsQuery request, CancellationToken ct)
    {
        IReadOnlyList<Enrollment> invitations = await courseRepository.ListUserInvitationsAsync(request.UserId, ct).ConfigureAwait(false);
        if (invitations.Count == 0)
        {
            return Result.Success<IReadOnlyList<CourseCardDto>>([]);
        }

        List<Guid> courseIds = invitations.Select(i => i.CourseId).Distinct().ToList();
        IReadOnlyList<CourseEntity> courses = await courseRepository.GetSummariesAsync(courseIds, ct).ConfigureAwait(false);

        List<Guid> ownerIds = courses.Select(c => c.OwnerUserId).Distinct().ToList();
        Dictionary<Guid, DisplayInfoDto> ownerMap = [];

        if (ownerIds.Count > 0 && profileContract is not null)
        {
            Result<IReadOnlyList<DisplayInfoDto>> displayResult = await profileContract.GetDisplayInfo(ownerIds, ct).ConfigureAwait(false);
            if (displayResult.IsSuccess)
            {
                ownerMap = displayResult.Value.ToDictionary(u => u.UserId);
            }
        }

        List<CourseCardDto> cards = [];
        foreach (CourseEntity course in courses)
        {
            if (course.IsDeleted || course.IsHidden)
            {
                continue;
            }

            ownerMap.TryGetValue(course.OwnerUserId, out DisplayInfoDto? owner);
            UserRefDto ownerRef = owner is not null
                ? new UserRefDto(owner.UserId, owner.DisplayName, owner.AvatarUrl)
                : new UserRefDto(course.OwnerUserId, "Giảng viên");

            int learnerCount = await courseRepository.GetLearnerCountAsync(course.Id, ct).ConfigureAwait(false);
            int nominationCount = await courseRepository.GetNominationCountAsync(course.Id, ct).ConfigureAwait(false);

            cards.Add(new CourseCardDto(
                Id: course.Id,
                Name: course.Name,
                CoverUrl: null,
                Owner: ownerRef,
                AccessMode: course.AccessMode.ToString().ToUpperInvariant(),
                Status: course.Status.ToString().ToUpperInvariant(),
                Tags: course.Tags.Select(t => t.Tag).ToList(),
                LearnerCount: learnerCount,
                RatingAvg: null,
                RatingCount: 0,
                NominationCount: nominationCount,
                ProgressPercent: null));
        }

        return Result.Success<IReadOnlyList<CourseCardDto>>(cards);
    }
}
