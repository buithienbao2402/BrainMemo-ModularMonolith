using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Messaging.Application.Abstractions;
using BrainMemo.Messaging.Application.DTOs;
using BrainMemo.Messaging.Domain.Entities;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using MsgUserRefDto = BrainMemo.Messaging.Application.DTOs.MessagingUserRefDto;

namespace BrainMemo.Messaging.Application.Queries;

public sealed record ListConversationsQuery(Guid UserId, Guid? CourseId, int Page, int PageSize) : IQuery<PagedResult<ConversationDto>>;
public sealed record GetConversationQuery(Guid ConversationId, Guid ViewerUserId) : IQuery<ConversationDto>;
public sealed record ListMessagesQuery(Guid ConversationId, Guid ViewerUserId, int Page, int PageSize) : IQuery<PagedResult<MessageDto>>;
public sealed record GetUnreadMessagesCountQuery(Guid UserId) : IQuery<UnreadMessagesCountDto>;

public sealed class MessagingQueryHandler(
    IMessagingRepository repository,
    ICourseContract courseContract,
    IProfileContract profileContract)
    : IQueryHandler<ListConversationsQuery, PagedResult<ConversationDto>>,
      IQueryHandler<GetConversationQuery, ConversationDto>,
      IQueryHandler<ListMessagesQuery, PagedResult<MessageDto>>,
      IQueryHandler<GetUnreadMessagesCountQuery, UnreadMessagesCountDto>
{
    public async Task<Result<PagedResult<ConversationDto>>> Handle(ListConversationsQuery request, CancellationToken ct)
    {
        int page = Math.Max(1, request.Page);
        int pageSize = Math.Clamp(request.PageSize <= 0 ? 20 : request.PageSize, 1, 50);

        PagedResult<Conversation> paged = await repository
            .ListUserConversationsAsync(request.UserId, request.CourseId, page, pageSize, ct)
            .ConfigureAwait(false);

        if (paged.Items.Count == 0)
        {
            return Result.Success(new PagedResult<ConversationDto>(Array.Empty<ConversationDto>(), page, pageSize, 0));
        }

        Guid[] courseIds = paged.Items.Select(c => c.CourseId).Distinct().ToArray();
        Dictionary<Guid, string> courseNames = new();
        Result<IReadOnlyList<CourseSummaryDto>> summaries = courseContract.GetCourseSummaries(courseIds, request.UserId);
        if (summaries.IsSuccess)
        {
            foreach (CourseSummaryDto s in summaries.Value)
            {
                if (!string.IsNullOrWhiteSpace(s.Name))
                {
                    courseNames[s.Id] = s.Name;
                }
            }
        }

        Guid[] userIds = paged.Items
            .SelectMany(c => new[] { c.StudentUserId, c.InstructorUserId })
            .Distinct()
            .ToArray();

        Dictionary<Guid, MsgUserRefDto> profiles = new();
        Result<IReadOnlyList<DisplayInfoDto>> infoResult = await profileContract.GetDisplayInfo(userIds, ct).ConfigureAwait(false);
        if (infoResult.IsSuccess)
        {
            foreach (DisplayInfoDto info in infoResult.Value)
            {
                profiles[info.UserId] = new MsgUserRefDto(info.UserId, info.DisplayName, info.AvatarUrl);
            }
        }

        List<ConversationDto> dtos = new(paged.Items.Count);
        foreach (Conversation conv in paged.Items)
        {
            int unread = await repository.CountUnreadInConversationAsync(conv.Id, request.UserId, ct).ConfigureAwait(false);
            dtos.Add(new ConversationDto(
                conv.Id,
                conv.CourseId,
                courseNames.GetValueOrDefault(conv.CourseId, "Khóa học"),
                profiles.GetValueOrDefault(conv.StudentUserId) ?? new MsgUserRefDto(conv.StudentUserId, "Học viên", null),
                profiles.GetValueOrDefault(conv.InstructorUserId) ?? new MsgUserRefDto(conv.InstructorUserId, "Giảng viên", null),
                conv.LastMessageAt,
                conv.LastMessagePreview,
                unread,
                conv.CreatedAt));
        }

        return Result.Success(new PagedResult<ConversationDto>(dtos, page, pageSize, paged.TotalItems));
    }

    public async Task<Result<ConversationDto>> Handle(GetConversationQuery request, CancellationToken ct)
    {
        Conversation? conv = await repository.GetConversationByIdAsync(request.ConversationId, ct).ConfigureAwait(false);
        if (conv is null)
        {
            return Result.Failure<ConversationDto>(Error.NotFound("Không tìm thấy cuộc trò chuyện."));
        }

        if (!conv.IsParticipant(request.ViewerUserId))
        {
            return Result.Failure<ConversationDto>(Error.Forbidden("Bạn không có quyền truy cập cuộc trò chuyện này."));
        }

        int unread = await repository.CountUnreadInConversationAsync(conv.Id, request.ViewerUserId, ct).ConfigureAwait(false);

        string courseName = "Khóa học";
        Result<IReadOnlyList<CourseSummaryDto>> summaries = courseContract.GetCourseSummaries([conv.CourseId], request.ViewerUserId);
        if (summaries.IsSuccess && summaries.Value.Count > 0 && !string.IsNullOrWhiteSpace(summaries.Value[0].Name))
        {
            courseName = summaries.Value[0].Name!;
        }

        Dictionary<Guid, MsgUserRefDto> profiles = new();
        Result<IReadOnlyList<DisplayInfoDto>> infoResult = await profileContract
            .GetDisplayInfo([conv.StudentUserId, conv.InstructorUserId], ct)
            .ConfigureAwait(false);
        if (infoResult.IsSuccess)
        {
            foreach (DisplayInfoDto info in infoResult.Value)
            {
                profiles[info.UserId] = new MsgUserRefDto(info.UserId, info.DisplayName, info.AvatarUrl);
            }
        }

        return Result.Success(new ConversationDto(
            conv.Id,
            conv.CourseId,
            courseName,
            profiles.GetValueOrDefault(conv.StudentUserId) ?? new MsgUserRefDto(conv.StudentUserId, "Học viên", null),
            profiles.GetValueOrDefault(conv.InstructorUserId) ?? new MsgUserRefDto(conv.InstructorUserId, "Giảng viên", null),
            conv.LastMessageAt,
            conv.LastMessagePreview,
            unread,
            conv.CreatedAt));
    }

    public async Task<Result<PagedResult<MessageDto>>> Handle(ListMessagesQuery request, CancellationToken ct)
    {
        Conversation? conv = await repository.GetConversationByIdAsync(request.ConversationId, ct).ConfigureAwait(false);
        if (conv is null)
        {
            return Result.Failure<PagedResult<MessageDto>>(Error.NotFound("Không tìm thấy cuộc trò chuyện."));
        }

        if (!conv.IsParticipant(request.ViewerUserId))
        {
            return Result.Failure<PagedResult<MessageDto>>(Error.Forbidden("Bạn không có quyền truy cập cuộc trò chuyện này."));
        }

        int page = Math.Max(1, request.Page);
        int pageSize = Math.Clamp(request.PageSize <= 0 ? 30 : request.PageSize, 1, 50);

        PagedResult<Message> paged = await repository
            .ListMessagesAsync(request.ConversationId, page, pageSize, ct)
            .ConfigureAwait(false);

        List<MessageDto> dtos = paged.Items
            .Select(m => new MessageDto(
                m.Id,
                m.ConversationId,
                m.SenderUserId,
                m.Content,
                null,
                m.ReadAt,
                m.CreatedAt))
            .ToList();

        return Result.Success(new PagedResult<MessageDto>(dtos, page, pageSize, paged.TotalItems));
    }

    public async Task<Result<UnreadMessagesCountDto>> Handle(GetUnreadMessagesCountQuery request, CancellationToken ct)
    {
        int totalUnread = await repository.CountTotalUnreadAsync(request.UserId, ct).ConfigureAwait(false);
        return Result.Success(new UnreadMessagesCountDto(totalUnread));
    }
}
