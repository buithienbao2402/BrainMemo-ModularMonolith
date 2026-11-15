using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Queries.ListMyBookmarks;

public sealed class ListMyBookmarksQueryHandler(
    ILearningRepository learningRepository,
    ICourseContract courseContract,
    IContentContract contentContract) : IQueryHandler<ListMyBookmarksQuery, IReadOnlyList<BookmarkDto>>
{
    public async Task<Result<IReadOnlyList<BookmarkDto>>> Handle(ListMyBookmarksQuery request, CancellationToken ct)
    {
        IReadOnlyList<Bookmark> bookmarks = await learningRepository
            .ListBookmarksAsync(request.CurrentUserId, ct)
            .ConfigureAwait(false);

        if (bookmarks.Count == 0)
        {
            return Result.Success<IReadOnlyList<BookmarkDto>>([]);
        }

        List<Guid> courseIds = bookmarks.Select(b => b.CourseId).Distinct().ToList();
        List<Guid> chapterIds = bookmarks.Select(b => b.ChapterId).Distinct().ToList();

        Result<IReadOnlyList<CourseSummaryDto>> courseSummariesResult = courseContract.GetCourseSummaries(courseIds, request.CurrentUserId);
        Dictionary<Guid, string> courseNames = courseSummariesResult.IsSuccess
            ? courseSummariesResult.Value.ToDictionary(c => c.Id, c => c.Name ?? "Khóa học")
            : [];

        Result<IReadOnlyList<ChapterInfoDto>> chaptersResult = contentContract.GetChapterInfo(chapterIds);
        Dictionary<Guid, string> chapterTitles = chaptersResult.IsSuccess
            ? chaptersResult.Value.ToDictionary(c => c.Id, c => c.Title)
            : [];

        List<BookmarkDto> dtos = bookmarks.Select(b => new BookmarkDto(
            CourseId: b.CourseId,
            CourseName: courseNames.TryGetValue(b.CourseId, out string? cName) ? cName : "Khóa học",
            ChapterId: b.ChapterId,
            ChapterTitle: chapterTitles.TryGetValue(b.ChapterId, out string? chTitle) ? chTitle : "Chương",
            UpdatedAt: b.UpdatedAt)).ToList();

        return Result.Success<IReadOnlyList<BookmarkDto>>(dtos);
    }
}
