using BrainMemo.Assessment.Contracts.Events;
using BrainMemo.Content.Contracts.Events;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Discovery.Application.EventHandlers;
using BrainMemo.Discovery.Application.Services;
using BrainMemo.Discovery.Contracts.Dtos;
using BrainMemo.Discovery.Domain.Entities;
using BrainMemo.Discovery.Infrastructure.Persistence;
using BrainMemo.Discovery.Infrastructure.Repositories;
using BrainMemo.Learning.Contracts;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Discovery.UnitTests;

public sealed class DiscoveryUnitTests
{
    private static DiscoveryDbContext CreateInMemoryDbContext()
    {
        DbContextOptions<DiscoveryDbContext> options = new DbContextOptionsBuilder<DiscoveryDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new DiscoveryDbContext(options);
    }

    [Fact]
    public async Task CourseUpserted_WhenEligibleIsFalse_DeletesEntryFromDatabase()
    {
        // Arrange
        using DiscoveryDbContext dbContext = CreateInMemoryDbContext();
        CourseEntryRepository entryRepo = new(dbContext);
        CourseActivityFactRepository factRepo = new(dbContext);
        CourseUpsertedEventHandler handler = new(entryRepo, NullLogger<CourseUpsertedEventHandler>.Instance);

        Guid courseId = Guid.NewGuid();
        CourseEntry existing = new()
        {
            CourseId = courseId,
            Name = "Lập trình .NET nâng cao",
            AccessMode = "PUBLIC",
            CourseStatus = "UPDATING",
            SourceRevision = 1,
            LastUpdatedAt = DateTimeOffset.UtcNow,
        };
        await entryRepo.UpsertAsync(existing);
        Assert.NotNull(await entryRepo.GetByIdAsync(courseId));

        // Act: Course becomes ineligible (e.g. OnlyMe, Hidden, or Deleted)
        CourseUpserted ineligibleEvent = new(
            EventId: Guid.NewGuid(),
            OccurredAt: DateTimeOffset.UtcNow,
            CourseId: courseId,
            Eligible: false,
            Revision: 2);

        await handler.HandleAsync(ineligibleEvent, CancellationToken.None);

        // Assert: Entry MUST be removed from dsc_course_entry
        CourseEntry? after = await entryRepo.GetByIdAsync(courseId);
        Assert.Null(after);
    }

    [Fact]
    public async Task CourseUpserted_WhenRevisionIsLowerOrEqual_StaleEventIsIgnored()
    {
        // Arrange
        using DiscoveryDbContext dbContext = CreateInMemoryDbContext();
        CourseEntryRepository entryRepo = new(dbContext);
        CourseUpsertedEventHandler handler = new(entryRepo, NullLogger<CourseUpsertedEventHandler>.Instance);

        Guid courseId = Guid.NewGuid();
        CourseEntry existing = new()
        {
            CourseId = courseId,
            Name = "Tiêu đề mới nhất",
            AccessMode = "PUBLIC",
            CourseStatus = "UPDATING",
            SourceRevision = 5,
            LastUpdatedAt = DateTimeOffset.UtcNow,
        };
        await entryRepo.UpsertAsync(existing);

        // Act: Stale event arrives with Revision = 4 (or 5)
        CourseUpserted staleEvent = new(
            EventId: Guid.NewGuid(),
            OccurredAt: DateTimeOffset.UtcNow.AddMinutes(-10),
            CourseId: courseId,
            Eligible: true,
            Revision: 4,
            Name: "Tiêu đề cũ lẽ ra bị ghi đè",
            AccessMode: "PUBLIC",
            Status: "UPDATING");

        await handler.HandleAsync(staleEvent, CancellationToken.None);

        // Assert: Name remains "Tiêu đề mới nhất" and Revision remains 5
        CourseEntry? entry = await entryRepo.GetByIdAsync(courseId);
        Assert.NotNull(entry);
        Assert.Equal("Tiêu đề mới nhất", entry.Name);
        Assert.Equal(5u, entry.SourceRevision);
    }

    [Fact]
    public async Task CoursePermanentlyDeleted_DeletesBothEntryAndActivityFacts()
    {
        // Arrange
        using DiscoveryDbContext dbContext = CreateInMemoryDbContext();
        CourseEntryRepository entryRepo = new(dbContext);
        CourseActivityFactRepository factRepo = new(dbContext);
        CoursePermanentlyDeletedEventHandler handler = new(
            entryRepo,
            factRepo,
            NullLogger<CoursePermanentlyDeletedEventHandler>.Instance);

        Guid courseId = Guid.NewGuid();
        await entryRepo.UpsertAsync(new CourseEntry
        {
            CourseId = courseId,
            Name = "Khóa sắp bị xóa",
            AccessMode = "PUBLIC",
            CourseStatus = "UPDATING",
            SourceRevision = 1,
            LastUpdatedAt = DateTimeOffset.UtcNow,
        });

        await factRepo.AddAsync(new CourseActivityFact
        {
            Id = Guid.NewGuid(),
            CourseId = courseId,
            ActivityType = "ENROLLMENT_NEW",
            SourceEventId = Guid.NewGuid(),
            OccurredAt = DateTimeOffset.UtcNow,
        });

        // Act
        CoursePermanentlyDeleted deleteEvent = new(
            EventId: Guid.NewGuid(),
            OccurredAt: DateTimeOffset.UtcNow,
            CourseId: courseId,
            CourseName: "Khóa sắp bị xóa",
            OwnerUserId: Guid.NewGuid(),
            ActorAdminId: Guid.NewGuid());

        await handler.HandleAsync(deleteEvent, CancellationToken.None);

        // Assert
        Assert.Null(await entryRepo.GetByIdAsync(courseId));
        var top = await factRepo.GetTop10Async("LEARNERS", null);
        Assert.Empty(top);
    }

    [Fact]
    public async Task EnrollmentAndNomination_UpdateFactsAndCountsIdempotently()
    {
        // Arrange
        using DiscoveryDbContext dbContext = CreateInMemoryDbContext();
        CourseEntryRepository entryRepo = new(dbContext);
        CourseActivityFactRepository factRepo = new(dbContext);

        Guid courseId = Guid.NewGuid();
        Guid userId = Guid.NewGuid();
        await entryRepo.UpsertAsync(new CourseEntry
        {
            CourseId = courseId,
            Name = "Khóa học thử nghiệm",
            AccessMode = "PUBLIC",
            CourseStatus = "UPDATING",
            LearnerCount = 0,
            NominationCount = 0,
            SourceRevision = 1,
            LastUpdatedAt = DateTimeOffset.UtcNow,
        });

        EnrollmentChangedEventHandler enrollHandler = new(entryRepo, factRepo, NullLogger<EnrollmentChangedEventHandler>.Instance);
        NominationChangedEventHandler nomHandler = new(entryRepo, factRepo, NullLogger<NominationChangedEventHandler>.Instance);

        Guid enrollEventId = Guid.NewGuid();
        EnrollmentChanged enrollEvent = new(
            EventId: enrollEventId,
            OccurredAt: DateTimeOffset.UtcNow,
            CourseId: courseId,
            OwnerUserId: Guid.NewGuid(),
            UserId: userId,
            Action: "ENROLLED",
            FromStatus: null,
            ToStatus: "ACTIVE");

        // Act 1: Process enrollment
        await enrollHandler.HandleAsync(enrollEvent, CancellationToken.None);
        // Act 1 Duplicate: Idempotent check
        await enrollHandler.HandleAsync(enrollEvent, CancellationToken.None);

        CourseEntry? entryAfterEnroll = await entryRepo.GetByIdAsync(courseId);
        Assert.NotNull(entryAfterEnroll);
        Assert.Equal(1, entryAfterEnroll.LearnerCount);

        // Act 2: Process Nomination
        Guid nomEventId = Guid.NewGuid();
        NominationChanged nomEvent = new(
            EventId: nomEventId,
            OccurredAt: DateTimeOffset.UtcNow,
            CourseId: courseId,
            UserId: userId,
            IsActive: true);

        await nomHandler.HandleAsync(nomEvent, CancellationToken.None);
        // Duplicate check
        await nomHandler.HandleAsync(nomEvent, CancellationToken.None);

        CourseEntry? entryAfterNom = await entryRepo.GetByIdAsync(courseId);
        Assert.NotNull(entryAfterNom);
        Assert.Equal(1, entryAfterNom.NominationCount);

        // Act 3: Withdraw Nomination
        Guid withdrawEventId = Guid.NewGuid();
        NominationChanged withdrawEvent = new(
            EventId: withdrawEventId,
            OccurredAt: DateTimeOffset.UtcNow,
            CourseId: courseId,
            UserId: userId,
            IsActive: false);

        await nomHandler.HandleAsync(withdrawEvent, CancellationToken.None);

        CourseEntry? entryAfterWithdraw = await entryRepo.GetByIdAsync(courseId);
        Assert.NotNull(entryAfterWithdraw);
        Assert.Equal(0, entryAfterWithdraw.NominationCount);
    }

    [Fact]
    public async Task SearchCourses_FiltersAndSortsCorrectly()
    {
        // Arrange
        using DiscoveryDbContext dbContext = CreateInMemoryDbContext();
        CourseEntryRepository entryRepo = new(dbContext);
        CourseActivityFactRepository factRepo = new(dbContext);
        SearchHistoryRepository searchRepo = new(dbContext);

        DiscoveryService service = new(
            entryRepo,
            factRepo,
            searchRepo,
            NullLogger<DiscoveryService>.Instance);

        DateTimeOffset now = DateTimeOffset.UtcNow;

        await entryRepo.UpsertAsync(new CourseEntry
        {
            CourseId = Guid.NewGuid(),
            Name = "Khóa học React 19",
            OwnerDisplayName = "Nam Nguyễn",
            AccessMode = "PUBLIC",
            CourseStatus = "COMPLETED",
            TagList = ["react", "frontend"],
            LearnerCount = 100,
            NominationCount = 50,
            ReviewCount = 20,
            LastUpdatedAt = now.AddDays(-2),
            FirstPublishedAt = now.AddMonths(-1),
            SourceRevision = 1,
        });

        await entryRepo.UpsertAsync(new CourseEntry
        {
            CourseId = Guid.NewGuid(),
            Name = "Khóa học .NET 9 Clean Architecture",
            OwnerDisplayName = "Tuấn Trần",
            AccessMode = "PUBLIC",
            CourseStatus = "UPDATING",
            TagList = ["dotnet", "backend"],
            LearnerCount = 200,
            NominationCount = 10,
            ReviewCount = 35,
            LastUpdatedAt = now.AddDays(-1),
            FirstPublishedAt = now.AddMonths(-2),
            SourceRevision = 1,
        });

        // Act: Search by keyword "React"
        var searchResult = await service.SearchCoursesAsync(
            new SearchCoursesFilter(Q: "React"),
            currentUserId: null);

        Assert.Single(searchResult.Items);
        Assert.Equal("Khóa học React 19", searchResult.Items[0].Name);

        // Act: Sort by MOST_LEARNERS
        var sortResult = await service.SearchCoursesAsync(
            new SearchCoursesFilter(Sort: "MOST_LEARNERS"),
            currentUserId: null);

        Assert.Equal(2, sortResult.Items.Count);
        Assert.Equal("Khóa học .NET 9 Clean Architecture", sortResult.Items[0].Name);
        Assert.Equal(200, sortResult.Items[0].LearnerCount);
    }

    [Fact]
    public async Task Top10_DeductsWithdrawnNominationsAndCalculatesAccurately()
    {
        // Arrange
        using DiscoveryDbContext dbContext = CreateInMemoryDbContext();
        CourseEntryRepository entryRepo = new(dbContext);
        CourseActivityFactRepository factRepo = new(dbContext);
        SearchHistoryRepository searchRepo = new(dbContext);

        DiscoveryService service = new(
            entryRepo,
            factRepo,
            searchRepo,
            NullLogger<DiscoveryService>.Instance);

        Guid courseA = Guid.NewGuid();
        Guid courseB = Guid.NewGuid();

        await entryRepo.UpsertAsync(new CourseEntry
        {
            CourseId = courseA,
            Name = "Course A",
            AccessMode = "PUBLIC",
            CourseStatus = "UPDATING",
            SourceRevision = 1,
            LastUpdatedAt = DateTimeOffset.UtcNow,
        });

        await entryRepo.UpsertAsync(new CourseEntry
        {
            CourseId = courseB,
            Name = "Course B",
            AccessMode = "PUBLIC",
            CourseStatus = "UPDATING",
            SourceRevision = 1,
            LastUpdatedAt = DateTimeOffset.UtcNow,
        });

        DateTimeOffset now = DateTimeOffset.UtcNow;

        // Course A: 3 nominations, 1 withdrawn -> Net: 2
        await factRepo.AddAsync(new CourseActivityFact { Id = Guid.NewGuid(), CourseId = courseA, ActivityType = "NOMINATION_NEW", SourceEventId = Guid.NewGuid(), OccurredAt = now });
        await factRepo.AddAsync(new CourseActivityFact { Id = Guid.NewGuid(), CourseId = courseA, ActivityType = "NOMINATION_NEW", SourceEventId = Guid.NewGuid(), OccurredAt = now });
        await factRepo.AddAsync(new CourseActivityFact { Id = Guid.NewGuid(), CourseId = courseA, ActivityType = "NOMINATION_NEW", SourceEventId = Guid.NewGuid(), OccurredAt = now });
        await factRepo.AddAsync(new CourseActivityFact { Id = Guid.NewGuid(), CourseId = courseA, ActivityType = "NOMINATION_WITHDRAWN", SourceEventId = Guid.NewGuid(), OccurredAt = now });

        // Course B: 1 nomination -> Net: 1
        await factRepo.AddAsync(new CourseActivityFact { Id = Guid.NewGuid(), CourseId = courseB, ActivityType = "NOMINATION_NEW", SourceEventId = Guid.NewGuid(), OccurredAt = now });

        // Act
        var top10 = await service.GetTop10Async("NOMINATIONS", "ALL_TIME");

        // Assert
        Assert.Equal(2, top10.Count);
        Assert.Equal(1, top10[0].Rank);
        Assert.Equal(courseA, top10[0].Course.Id);
        Assert.Equal(2, top10[0].Count);

        Assert.Equal(2, top10[1].Rank);
        Assert.Equal(courseB, top10[1].Course.Id);
        Assert.Equal(1, top10[1].Count);
    }

    [Fact]
    public async Task SearchHistory_SavedOnlyWhenUserIsAuthenticated()
    {
        // Arrange
        using DiscoveryDbContext dbContext = CreateInMemoryDbContext();
        CourseEntryRepository entryRepo = new(dbContext);
        CourseActivityFactRepository factRepo = new(dbContext);
        SearchHistoryRepository searchRepo = new(dbContext);

        DiscoveryService service = new(
            entryRepo,
            factRepo,
            searchRepo,
            NullLogger<DiscoveryService>.Instance);

        Guid userId = Guid.NewGuid();

        // Act 1: Anonymous search
        await service.SearchCoursesAsync(new SearchCoursesFilter(Q: "Golang"), currentUserId: null);
        var anonHistory = await service.ListSearchHistoryAsync(userId);
        Assert.Empty(anonHistory);

        // Act 2: Authenticated search
        await service.SearchCoursesAsync(new SearchCoursesFilter(Q: "Rust Programming"), currentUserId: userId);
        var userHistory = await service.ListSearchHistoryAsync(userId);

        Assert.Single(userHistory);
        Assert.Equal("Rust Programming", userHistory[0].QueryText);
    }

    [Fact]
    public async Task CourseRanking_ComputesCorrectRanks()
    {
        // Arrange
        using DiscoveryDbContext dbContext = CreateInMemoryDbContext();
        CourseEntryRepository entryRepo = new(dbContext);
        CourseActivityFactRepository factRepo = new(dbContext);
        SearchHistoryRepository searchRepo = new(dbContext);

        DiscoveryService service = new(
            entryRepo,
            factRepo,
            searchRepo,
            NullLogger<DiscoveryService>.Instance);

        Guid topCourse = Guid.NewGuid();
        Guid secondCourse = Guid.NewGuid();

        await entryRepo.UpsertAsync(new CourseEntry
        {
            CourseId = topCourse,
            Name = "Top Course",
            AccessMode = "PUBLIC",
            CourseStatus = "UPDATING",
            LearnerCount = 100,
            NominationCount = 50,
            ReviewCount = 20,
            SourceRevision = 1,
            LastUpdatedAt = DateTimeOffset.UtcNow,
        });

        await entryRepo.UpsertAsync(new CourseEntry
        {
            CourseId = secondCourse,
            Name = "Second Course",
            AccessMode = "PUBLIC",
            CourseStatus = "UPDATING",
            LearnerCount = 50,
            NominationCount = 10,
            ReviewCount = 5,
            SourceRevision = 1,
            LastUpdatedAt = DateTimeOffset.UtcNow,
        });

        // Act
        CourseRankingDto? ranking = await service.GetCourseRankingAsync(secondCourse);

        // Assert
        Assert.NotNull(ranking);
        Assert.Equal(2, ranking.TotalEligibleCourses);
        Assert.Equal(2, ranking.LearnerRank);
        Assert.Equal(2, ranking.NominationRank);
        Assert.Equal(2, ranking.ReviewRank);
    }

    [Fact]
    public async Task CourseReviewCreated_InsertsFact_AndUpdatesEntryAvgRatingAndReviewCount()
    {
        using DiscoveryDbContext dbContext = CreateInMemoryDbContext();
        CourseEntryRepository entryRepo = new(dbContext);
        CourseActivityFactRepository factRepo = new(dbContext);
        CourseReviewCreatedEventHandler handler = new(entryRepo, factRepo, NullLogger<CourseReviewCreatedEventHandler>.Instance);

        Guid courseId = Guid.NewGuid();
        Guid studentId = Guid.NewGuid();
        Guid eventId = Guid.NewGuid();

        await entryRepo.UpsertAsync(new CourseEntry
        {
            CourseId = courseId,
            Name = "Course 1",
            AccessMode = "PUBLIC",
            CourseStatus = "UPDATING",
            ReviewCount = 0,
            AvgRating = null,
            SourceRevision = 1,
            LastUpdatedAt = DateTimeOffset.UtcNow,
        });

        var createdEvent = new CourseReviewCreated(
            EventId: eventId,
            OccurredAt: DateTimeOffset.UtcNow,
            ReviewId: Guid.NewGuid(),
            CourseId: courseId,
            UserId: studentId,
            Rating: 5,
            CommentText: "Great!",
            AvgRating: 5.0m,
            ReviewCount: 1);

        await handler.HandleAsync(createdEvent, CancellationToken.None);

        var entry = await entryRepo.GetByIdAsync(courseId);
        Assert.NotNull(entry);
        Assert.Equal(1, entry.ReviewCount);
        Assert.Equal(5.0m, entry.AvgRating);

        var fact = await dbContext.CourseActivityFacts.FirstOrDefaultAsync(f => f.SourceEventId == eventId);
        Assert.NotNull(fact);
        Assert.Equal("REVIEW_NEW", fact.ActivityType);
        Assert.Equal(courseId, fact.CourseId);
        Assert.Equal(studentId, fact.UserId);

        // Duplicate event idempotency test
        await handler.HandleAsync(createdEvent, CancellationToken.None);
        var entryAfterDup = await entryRepo.GetByIdAsync(courseId);
        Assert.Equal(1, entryAfterDup!.ReviewCount);
    }

    [Fact]
    public async Task CourseReviewUpdated_UpdatesEntryAvgRating_WithoutCreatingFact()
    {
        using DiscoveryDbContext dbContext = CreateInMemoryDbContext();
        CourseEntryRepository entryRepo = new(dbContext);
        CourseReviewUpdatedEventHandler handler = new(entryRepo, NullLogger<CourseReviewUpdatedEventHandler>.Instance);

        Guid courseId = Guid.NewGuid();
        Guid studentId = Guid.NewGuid();

        await entryRepo.UpsertAsync(new CourseEntry
        {
            CourseId = courseId,
            Name = "Course 1",
            AccessMode = "PUBLIC",
            CourseStatus = "UPDATING",
            ReviewCount = 1,
            AvgRating = 5.0m,
            SourceRevision = 1,
            LastUpdatedAt = DateTimeOffset.UtcNow,
        });

        var updatedEvent = new CourseReviewUpdated(
            EventId: Guid.NewGuid(),
            OccurredAt: DateTimeOffset.UtcNow,
            ReviewId: Guid.NewGuid(),
            CourseId: courseId,
            UserId: studentId,
            OldRating: 5,
            NewRating: 4,
            CommentText: "Updated comment",
            AvgRating: 4.0m,
            ReviewCount: 1);

        await handler.HandleAsync(updatedEvent, CancellationToken.None);

        var entry = await entryRepo.GetByIdAsync(courseId);
        Assert.NotNull(entry);
        Assert.Equal(1, entry.ReviewCount);
        Assert.Equal(4.0m, entry.AvgRating);

        // Verify no fact added in db
        var facts = await dbContext.CourseActivityFacts.ToListAsync();
        Assert.Empty(facts);
    }
}
