import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, Filter, RotateCcw, History, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/shared/hooks';
import { Button, Input, Skeleton } from '@/shared/ui';
import {
  useSearchCoursesQuery,
  useSearchHistoryQuery,
  type SearchCoursesParams,
  type CourseStatus,
} from '../api/discoveryApi';
import { CourseCardItem } from '../components/CourseCardItem';

const POPULAR_TAGS = [
  'Lập trình',
  'AI',
  'Frontend',
  'Backend',
  'DevOps',
  'Bảo mật',
  'Database',
  'Mobile',
  'Toán',
  'Hệ thống',
];

const SORT_OPTIONS = [
  { value: 'RECENTLY_UPDATED', label: 'Mới cập nhật gần đây' },
  { value: 'NEWEST_LAUNCH', label: 'Mới ra mắt' },
  { value: 'MOST_LEARNERS', label: 'Học viên đông nhất' },
  { value: 'MOST_NOMINATED', label: 'Được đề cử nhiều nhất' },
  { value: 'MOST_REVIEWED', label: 'Đánh giá nhiều nhất' },
  { value: 'MOST_COMMENTED', label: 'Bình luận sôi nổi nhất' },
] as const;

export function CourseDiscoveryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { status: authStatus } = useAuth();
  const isAuthenticated = authStatus === 'authenticated';

  // Read URL params (DSC-02: URL giữ query)
  const qParam = searchParams.get('q') || '';
  const tagParam = searchParams.get('tag') || '';
  const accessModeParam = (searchParams.get('accessMode') as 'PUBLIC' | 'PRIVATE') || '';
  const statusParam = (searchParams.get('status') as CourseStatus) || '';
  const sortParam = (searchParams.get('sort') as SearchCoursesParams['sort']) || 'RECENTLY_UPDATED';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  // Local search input state for smooth typing
  const [searchInput, setSearchInput] = useState(qParam);
  const [showHistory, setShowHistory] = useState(false);

  // Sync search input when URL changes externally
  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  // Fetch search history for authenticated users
  const { data: searchHistory = [] } = useSearchHistoryQuery(isAuthenticated);

  // Query courses
  const { data, isLoading, isFetching } = useSearchCoursesQuery({
    q: qParam,
    tag: tagParam,
    accessMode: accessModeParam || undefined,
    status: statusParam || undefined,
    sort: sortParam,
    page: pageParam,
    pageSize: 12,
  });

  const updateFilters = (newParams: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === '') {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    });
    // Reset to page 1 on filter changes unless changing page itself
    if (!('page' in newParams)) {
      next.delete('page');
    }
    setSearchParams(next, { replace: true });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowHistory(false);
    updateFilters({ q: searchInput.trim() });
  };

  const handleSelectHistory = (queryText: string) => {
    setSearchInput(queryText);
    setShowHistory(false);
    updateFilters({ q: queryText });
  };

  const handleClearSearch = () => {
    setSearchInput('');
    updateFilters({ q: null });
  };

  const handleResetAll = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const totalCourses = data?.meta?.totalItems ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;
  const currentPage = data?.meta?.page ?? pageParam;
  const courseList = data?.items || [];

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
      {/* 1. Header & Search Banner */}
      <div className="mb-8 space-y-4">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Khám phá Khóa học
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tìm kiếm khóa học theo từ khóa, chuyên ngành, chế độ truy cập và độ phổ biến.
          </p>
        </div>

        {/* Search Input Bar with History Popover */}
        <div className="relative max-w-2xl">
          <form onSubmit={handleSearchSubmit} className="relative z-30 flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-course-input"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onFocus={() => setShowHistory(true)}
              placeholder="Tìm kiếm khóa học, tác giả, nội dung..."
              className="h-11 pl-10 pr-20 text-sm shadow-sm"
              aria-label="Tìm kiếm khóa học"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-12 text-muted-foreground hover:text-foreground"
                aria-label="Xóa từ khóa"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <Button
              type="submit"
              size="sm"
              className="absolute right-1.5 h-8 px-3 font-semibold"
            >
              Tìm
            </Button>
          </form>

          {/* Search History Dropdown */}
          {showHistory && isAuthenticated && searchHistory.length > 0 && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowHistory(false)}
                aria-hidden="true"
              />
              <div className="absolute top-full left-0 z-30 mt-1.5 w-full rounded-xl border border-border bg-card p-2 shadow-lg">
                <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  <History className="h-3.5 w-3.5" />
                  <span>Tìm kiếm gần đây</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5 p-1">
                  {searchHistory.slice(0, 8).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectHistory(item.queryText || '')}
                      className="rounded-lg bg-secondary/80 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      {item.queryText}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Main Content Grid: Sidebar Filters + Results */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Left Filter Sidebar */}
        <aside className="space-y-6 lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Filter className="h-4 w-4 text-primary" />
                <span>Bộ lọc tìm kiếm</span>
              </div>
              {(qParam || tagParam || accessModeParam || statusParam) && (
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Đặt lại</span>
                </button>
              )}
            </div>

            {/* Chế độ truy cập (Access Mode) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Chế độ truy cập
              </label>
              <div className="flex flex-col gap-1.5">
                {[
                  { value: '', label: 'Tất cả' },
                  { value: 'PUBLIC', label: 'Công khai (Public)' },
                  { value: 'PRIVATE', label: 'Riêng tư (Private)' },
                ].map((mode) => (
                  <label
                    key={mode.value}
                    className="flex cursor-pointer items-center gap-2 text-sm text-foreground hover:text-primary"
                  >
                    <input
                      type="radio"
                      name="accessMode"
                      value={mode.value}
                      checked={accessModeParam === mode.value}
                      onChange={(e) => updateFilters({ accessMode: e.target.value })}
                      className="text-primary focus:ring-primary"
                    />
                    <span>{mode.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Trạng thái khóa học (Status) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Trạng thái khóa học
              </label>
              <div className="flex flex-col gap-1.5">
                {[
                  { value: '', label: 'Tất cả' },
                  { value: 'UPDATING', label: 'Đang cập nhật' },
                  { value: 'COMPLETED', label: 'Đã hoàn thành' },
                  { value: 'PAUSED', label: 'Tạm dừng' },
                ].map((st) => (
                  <label
                    key={st.value}
                    className="flex cursor-pointer items-center gap-2 text-sm text-foreground hover:text-primary"
                  >
                    <input
                      type="radio"
                      name="courseStatus"
                      value={st.value}
                      checked={statusParam === st.value}
                      onChange={(e) => updateFilters({ status: e.target.value })}
                      className="text-primary focus:ring-primary"
                    />
                    <span>{st.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Chủ đề & Tags */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Chủ đề & Thẻ
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => updateFilters({ tag: null })}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    !tagParam
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  Tất cả
                </button>
                {POPULAR_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => updateFilters({ tag: tag === tagParam ? null : tag })}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      tagParam.toLowerCase() === tag.toLowerCase()
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Right Results Section */}
        <div className="space-y-6 lg:col-span-3">
          {/* Results Bar: Count + Sort Dropdown */}
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Tìm thấy <strong className="font-bold text-foreground">{totalCourses}</strong> khóa học
              {qParam && (
                <span>
                  {' '}cho từ khóa "<span className="text-foreground">{qParam}</span>"
                </span>
              )}
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <label htmlFor="course-sort-select" className="text-xs font-semibold text-muted-foreground">
                Sắp xếp:
              </label>
              <select
                id="course-sort-select"
                value={sortParam}
                onChange={(e) => updateFilters({ sort: e.target.value })}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                aria-label="Chọn tiêu chí sắp xếp"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col space-y-3 rounded-xl border border-border p-4">
                  <Skeleton className="aspect-[16/9] w-full rounded-lg" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="mt-4 h-4 w-full" />
                </div>
              ))}
            </div>
          ) : courseList.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-12 text-center">
              <div className="rounded-full bg-secondary/80 p-4 text-muted-foreground">
                <Search className="h-8 w-8" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-bold text-foreground">
                Không tìm thấy khóa học phù hợp
              </h3>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                Thử thay đổi từ khóa tìm kiếm hoặc gỡ bỏ các tiêu chí lọc để xem thêm các khóa học khác.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetAll}
                className="mt-5 gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Xem tất cả khóa học</span>
              </Button>
            </div>
          ) : (
            /* Course Grid */
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courseList.map((course) => (
                <CourseCardItem key={course.id} course={course} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || isFetching}
                onClick={() => updateFilters({ page: (currentPage - 1).toString() })}
                className="gap-1 px-3 text-xs"
                aria-label="Trang trước"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Trước</span>
              </Button>

              <span className="px-3 text-xs font-semibold text-muted-foreground">
                Trang {currentPage} / {totalPages}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || isFetching}
                onClick={() => updateFilters({ page: (currentPage + 1).toString() })}
                className="gap-1 px-3 text-xs"
                aria-label="Trang tiếp"
              >
                <span>Sau</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
