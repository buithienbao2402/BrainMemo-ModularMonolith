using BrainMemo.BuildingBlocks.Infrastructure.Pagination;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace BuildingBlocks.UnitTests.Pagination;

public sealed class PagingTests
{
    [Theory]
    [InlineData(0, 0, 1, 20)]
    [InlineData(-3, -10, 1, 20)]
    [InlineData(2, 10, 2, 10)]
    [InlineData(3, 50, 3, 50)]
    [InlineData(4, 51, 4, 50)]
    [InlineData(1, 500, 1, 50)]
    public void PageRequest_Normalize_ClampsPageAndMaxPageSize50(
        int inputPage,
        int inputPageSize,
        int expectedPage,
        int expectedPageSize)
    {
        PageRequest normalized = new PageRequest(inputPage, inputPageSize).Normalize();

        Assert.Equal(expectedPage, normalized.Page);
        Assert.Equal(expectedPageSize, normalized.PageSize);
    }

    [Fact]
    public void PageRequest_Skip_ComputesOffsetWithoutOverflow()
    {
        Assert.Equal(0, new PageRequest(1, 20).Skip);
        Assert.Equal(40, new PageRequest(3, 20).Skip);
        Assert.Equal(100, new PageRequest(3, 999).Skip);
        Assert.Equal(int.MaxValue, new PageRequest(int.MaxValue, 50).Skip);
    }

    [Fact]
    public void CursorPageRequest_Normalize_ClampsPageSize()
    {
        Guid afterId = UuidV7.NewGuid();
        Assert.Equal(20, new CursorPageRequest(afterId, 0).Normalize().PageSize);
        Assert.Equal(50, new CursorPageRequest(afterId, 250).Normalize().PageSize);
        Assert.Equal(15, CursorPageRequest.Create(afterId, 15).PageSize);
    }

    [Fact]
    public void PagedResult_ComputesTotalsAndMapsItems()
    {
        PagedResult<int> paged = new([1, 2, 3], Page: 2, PageSize: 3, TotalItems: 10);

        Assert.Equal(10, paged.Total);
        Assert.Equal(4, paged.TotalPages);
        Assert.True(paged.HasPreviousPage);
        Assert.True(paged.HasNextPage);

        PagedResult<string> mapped = paged.Map(x => $"item-{x}");
        Assert.Equal(["item-1", "item-2", "item-3"], mapped.Items);
        Assert.Equal(10, mapped.TotalItems);

        PagedResult<int> empty = PagedResult<int>.Empty(page: 0, pageSize: 100);
        Assert.Empty(empty.Items);
        Assert.Equal(1, empty.Page);
        Assert.Equal(50, empty.PageSize);
        Assert.Equal(0, empty.TotalPages);
    }

    [Fact]
    public async Task QueryablePagingExtensions_ToPagedResultAsync_And_ToPageAsync_WorkWithEfCore()
    {
        DbContextOptions<TestPagingDbContext> options = new DbContextOptionsBuilder<TestPagingDbContext>()
            .UseInMemoryDatabase($"paging-{Guid.NewGuid()}")
            .Options;

        await using TestPagingDbContext db = new(options);
        List<TestItem> seeded = Enumerable.Range(1, 55)
            .Select(i => new TestItem { Id = UuidV7.NewGuid(), Order = i })
            .ToList();
        db.Items.AddRange(seeded);
        await db.SaveChangesAsync();

        PagedResult<TestItem> oversizedRequest = await db.Items
            .OrderBy(x => x.Order)
            .ToPagedResultAsync(new PageRequest(Page: 2, PageSize: 100));

        Assert.Equal(55, oversizedRequest.TotalItems);
        Assert.Equal(50, oversizedRequest.PageSize);
        Assert.Equal(2, oversizedRequest.TotalPages);
        Assert.Equal(5, oversizedRequest.Items.Count);
        Assert.Equal(51, oversizedRequest.Items[0].Order);
        Assert.False(oversizedRequest.HasNextPage);

        Page<TestItem> cursorPage = await db.Items
            .OrderBy(x => x.Order)
            .ToPageAsync(pageSize: 10, x => x.Id);

        Assert.Equal(10, cursorPage.Items.Count);
        Assert.True(cursorPage.HasMore);
        Assert.Equal(cursorPage.Items[^1].Id, cursorPage.AfterId);

        Page<TestItem> tailPage = await db.Items
            .Where(x => x.Order > 50)
            .OrderBy(x => x.Order)
            .ToPageAsync(pageSize: 10, x => x.Id);

        Assert.Equal(5, tailPage.Items.Count);
        Assert.False(tailPage.HasMore);
        Assert.Equal(tailPage.Items[^1].Id, tailPage.AfterId);
    }

    private sealed class TestItem
    {
        public Guid Id { get; init; }
        public int Order { get; init; }
    }

    private sealed class TestPagingDbContext(DbContextOptions<TestPagingDbContext> options) : DbContext(options)
    {
        public DbSet<TestItem> Items => Set<TestItem>();
    }
}
