using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Queries.ListComments;

public sealed class ListCommentsQueryHandler(
    ILearningRepository learningRepository,
    IProfileContract profileContract) : IQueryHandler<ListCommentsQuery, PagedResult<CommentDto>>
{
    public async Task<Result<PagedResult<CommentDto>>> Handle(ListCommentsQuery request, CancellationToken ct)
    {
        int page = Math.Max(1, request.Page);
        int pageSize = Math.Clamp(request.PageSize <= 0 ? 20 : request.PageSize, 1, 50);

        PagedResult<Comment> pagedRoots = await learningRepository
            .ListRootCommentsAsync(request.CourseId, request.ChapterId, page, pageSize, ct)
            .ConfigureAwait(false);

        List<Guid> rootIds = pagedRoots.Items.Select(r => r.Id).ToList();

        IReadOnlyList<Comment> replies = await learningRepository
            .ListRepliesForParentsAsync(rootIds, ct)
            .ConfigureAwait(false);

        Dictionary<Guid, List<Comment>> repliesByParent = replies
            .GroupBy(r => r.ParentCommentId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        HashSet<Guid> allUserIds = new();
        foreach (Comment root in pagedRoots.Items)
        {
            allUserIds.Add(root.UserId);
        }
        foreach (Comment reply in replies)
        {
            allUserIds.Add(reply.UserId);
        }

        Dictionary<Guid, UserRefDto> userProfiles = await LoadUserProfilesAsync(allUserIds.ToList(), ct).ConfigureAwait(false);

        List<CommentDto> rootDtos = new(pagedRoots.Items.Count);
        foreach (Comment root in pagedRoots.Items)
        {
            UserRefDto author = userProfiles.TryGetValue(root.UserId, out UserRefDto? a)
                ? a
                : new UserRefDto(root.UserId, "Người dùng", null);

            List<CommentDto> childDtos = new();
            if (repliesByParent.TryGetValue(root.Id, out List<Comment>? childReplies))
            {
                foreach (Comment reply in childReplies)
                {
                    UserRefDto replyAuthor = userProfiles.TryGetValue(reply.UserId, out UserRefDto? ra)
                        ? ra
                        : new UserRefDto(reply.UserId, "Người dùng", null);

                    childDtos.Add(new CommentDto(
                        Id: reply.Id,
                        CourseId: reply.CourseId,
                        ChapterId: reply.ChapterId,
                        Author: replyAuthor,
                        ParentCommentId: reply.ParentCommentId,
                        Content: reply.Content,
                        IsPinned: reply.IsPinned,
                        EditedAt: reply.EditedAt,
                        CreatedAt: reply.CreatedAt,
                        Replies: Array.Empty<CommentDto>()));
                }
            }

            rootDtos.Add(new CommentDto(
                Id: root.Id,
                CourseId: root.CourseId,
                ChapterId: root.ChapterId,
                Author: author,
                ParentCommentId: root.ParentCommentId,
                Content: root.Content,
                IsPinned: root.IsPinned,
                EditedAt: root.EditedAt,
                CreatedAt: root.CreatedAt,
                Replies: childDtos));
        }

        return new PagedResult<CommentDto>(
            rootDtos,
            pagedRoots.Page,
            pagedRoots.PageSize,
            pagedRoots.TotalItems);
    }

    private async Task<Dictionary<Guid, UserRefDto>> LoadUserProfilesAsync(IReadOnlyList<Guid> userIds, CancellationToken ct)
    {
        Dictionary<Guid, UserRefDto> dict = new();
        if (userIds.Count == 0)
        {
            return dict;
        }

        try
        {
            Result<IReadOnlyList<DisplayInfoDto>> result = await profileContract
                .GetDisplayInfo(userIds, ct)
                .ConfigureAwait(false);

            if (result.IsSuccess)
            {
                foreach (DisplayInfoDto info in result.Value)
                {
                    dict[info.UserId] = new UserRefDto(info.UserId, info.DisplayName, info.AvatarUrl);
                }
            }
        }
        catch
        {
            // Graceful fallback
        }

        return dict;
    }
}
