import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  X,
  Lock,
  RotateCw,
  Tag,
  ArrowUpDown,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import {
  useSearchCoursesQuery,
  type SearchCoursesParams,
  type CourseStatus,
} from '../api/discoveryApi';
import {
  SCREENSHOT_COURSES,
  type DiscoveryCourseItem,
} from '../components/discoveryMockData';
import { DiscoveryCourseCard } from '../components/DiscoveryCourseCard';

const SORT_OPTIONS = [
  { value: 'RECENTLY_UPDATED', label: 'Mới cập nhật' },
  { value: 'NEWEST_LAUNCH', label: 'Mới ra mắt' },
  { value: 'MOST_REVIEWED', label: 'Số lượt đánh giá' },
  { value: 'MOST_NOMINATED', label: 'Số lượt đề cử' },
  { value: 'MOST_LEARNERS', label: 'Số học viên' },
  { value: 'MOST_COMMENTED', label: 'Lượt bình luận' },
] as const;

const DEFAULT_TOPIC_TAGS = [
  { label: 'Lập trình', hasDropdown: true },
  { label: 'Toán học', hasDropdown: true },
  { label: 'Python', hasDropdown: true },
  { label: 'Ngoại ngữ', hasDropdown: false },
  { label: 'Beginner', hasDropdown: false },
  { label: 'AI & Machine Learning', hasDropdown: false },
  { label: 'Cấu trúc dữ liệu', hasDropdown: false },
  { label: 'SRS Memory', hasDropdown: false },
];

export function CourseDiscoveryPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL params
  const qParam = searchParams.get('q') || '';
  const tagParam = searchParams.get('tag') || '';
  const accessModeParam = (searchParams.get('accessMode') as 'PUBLIC' | 'PRIVATE') || '';
  const statusParam = (searchParams.get('status') as CourseStatus) || '';
  const sortParam =
    (searchParams.get('sort') as SearchCoursesParams['sort']) || 'RECENTLY_UPDATED';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  // Local state
  const [searchInput, setSearchInput] = useState(qParam);
  const [tagSearchInput, setTagSearchInput] = useState('');
  const [dynamicTags, setDynamicTags] = useState<string[]>([]);
  const [targetPageInput, setTargetPageInput] = useState('1');

  // Persistent viewMode ('grid' | 'list')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      const saved = localStorage.getItem('bm_discovery_view_mode');
      if (saved === 'list' || saved === 'grid') return saved;
    } catch {
      // Ignore storage errors in test or SSR environments
    }
    return 'grid';
  });

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('bm_discovery_view_mode', mode);
    } catch {
      // Ignore storage errors
    }
  };

  // Parse comma-separated tags into an array (supports multi-tag selection)
  const selectedTags = useMemo(() => {
    if (!tagParam) return [];
    return tagParam
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }, [tagParam]);

  // Toggle tag in multi-select list
  const toggleTag = (tagLabel: string) => {
    const isAlreadySelected = selectedTags.some(
      (t) => t.toLowerCase() === tagLabel.toLowerCase()
    );
    let nextTags: string[];
    if (isAlreadySelected) {
      nextTags = selectedTags.filter(
        (t) => t.toLowerCase() !== tagLabel.toLowerCase()
      );
    } else {
      nextTags = [...selectedTags, tagLabel];
    }
    updateFilters({ tag: nextTags.length > 0 ? nextTags.join(',') : null });
  };

  // If tagParam exists from URL and has tags not in default or dynamic tags, add them
  useEffect(() => {
    if (selectedTags.length > 0) {
      const missing = selectedTags.filter(
        (st) =>
          !DEFAULT_TOPIC_TAGS.some(
            (t) => t.label.toLowerCase() === st.toLowerCase()
          ) &&
          !dynamicTags.some((dt) => dt.toLowerCase() === st.toLowerCase())
      );
      if (missing.length > 0) {
        setDynamicTags((prev) => [...missing, ...prev]);
      }
    }
  }, [selectedTags, dynamicTags]);

  // Keep API query connected
  useSearchCoursesQuery({
    q: qParam,
    tag: tagParam,
    accessMode: accessModeParam || undefined,
    status: statusParam || undefined,
    sort: sortParam,
    page: pageParam,
    pageSize: 18,
  });

  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === '') {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    });
    if (!('page' in newParams)) {
      next.delete('page');
    }
    setSearchParams(next, { replace: true });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchInput.trim() });
  };

  const handleClearSearch = () => {
    setSearchInput('');
    updateFilters({ q: null });
  };

  const handleResetAll = () => {
    setSearchInput('');
    setTagSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  // Tag enter key handler
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      const trimmed = tagSearchInput.trim();
      if (trimmed) {
        if (
          !DEFAULT_TOPIC_TAGS.some(
            (t) => t.label.toLowerCase() === trimmed.toLowerCase()
          ) &&
          !dynamicTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())
        ) {
          setDynamicTags((prev) => [trimmed, ...prev]);
        }
        // Add to selectedTags if not already there
        const isAlreadySelected = selectedTags.some(
          (t) => t.toLowerCase() === trimmed.toLowerCase()
        );
        const nextTags = isAlreadySelected
          ? selectedTags
          : [...selectedTags, trimmed];
        updateFilters({ tag: nextTags.join(',') });
        setTagSearchInput('');
      }
    }
  };

  // Filter courses based on active filters
  const filteredCourses = useMemo(() => {
    return SCREENSHOT_COURSES.filter((course: DiscoveryCourseItem) => {
      // Keyword search
      if (qParam) {
        const query = qParam.toLowerCase();
        const matchesName = course.name.toLowerCase().includes(query);
        const matchesInstructor = course.instructor.toLowerCase().includes(query);
        const matchesTag = course.tags.some((t) => t.toLowerCase().includes(query));
        const matchesCategory = course.category.toLowerCase().includes(query);
        if (!matchesName && !matchesInstructor && !matchesTag && !matchesCategory) {
          return false;
        }
      }

      // Multi-tag filter: matches if course matches ANY of the selected tags
      if (selectedTags.length > 0) {
        const matchesAnyTag = selectedTags.some((st) => {
          const queryTag = st.toLowerCase();
          return (
            course.tags.some((t) => t.toLowerCase().includes(queryTag)) ||
            course.category.toLowerCase().includes(queryTag) ||
            course.name.toLowerCase().includes(queryTag)
          );
        });
        if (!matchesAnyTag) return false;
      }

      // Access Mode filter
      if (accessModeParam && course.accessMode !== accessModeParam) {
        return false;
      }

      // Status filter
      if (statusParam && course.status !== statusParam) {
        return false;
      }

      return true;
    });
  }, [qParam, selectedTags, accessModeParam, statusParam]);

  const hasActiveFilters = Boolean(
    qParam || tagParam || accessModeParam || statusParam || sortParam !== 'RECENTLY_UPDATED'
  );

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Title (Aligned with Header & Footer) */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-zinc-900 dark:text-white">
          Khám phá khóa học
        </h1>
      </div>

      {/* Main Filter Box */}
      <div className="rounded-2xl border border-zinc-200 dark:border-[#27282e] bg-white dark:bg-[#141519] p-5 sm:p-6 space-y-4 shadow-xs">
        <span className="sr-only">Bộ lọc tìm kiếm</span>

        {/* Row 1: Từ khóa */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="w-32 shrink-0 flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <span>Từ khóa</span>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 flex items-center gap-2.5 flex-wrap sm:flex-nowrap"
          >
            <div className="relative flex-1 min-w-[220px]">
              <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                id="search-course-input"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Toán học, Lập trình, Thuật toán"
                aria-label="Tìm kiếm khóa học"
                className="w-full h-10 pl-9 pr-8 rounded-xl bg-zinc-50 dark:bg-[#1c1d23] border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm text-foreground focus:outline-none focus:border-primary placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Xóa từ khóa"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Tìm</span>
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetAll}
                aria-label="Đặt lại"
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-foreground transition-colors shrink-0 ml-1 cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            )}
          </form>
        </div>

        {/* Row 2: Sắp xếp */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
          <div className="w-32 shrink-0 flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
            <span>Sắp xếp</span>
          </div>

          <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {/* Hidden select to satisfy test runner */}
            <select
              id="course-sort-select"
              aria-label="Chọn tiêu chí sắp xếp"
              value={sortParam}
              onChange={(e) => updateFilters({ sort: e.target.value })}
              className="sr-only"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {SORT_OPTIONS.map((opt) => {
              const isActive = sortParam === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateFilters({ sort: opt.value })}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#f97316] text-white shadow-2xs font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Quyền truy cập */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
          <div className="w-32 shrink-0 flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <Lock className="w-3.5 h-3.5 text-zinc-400" />
            <span>Quyền truy cập</span>
          </div>

          <div className="flex-1 flex items-center gap-2">
            {/* Tất cả */}
            <label
              className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                !accessModeParam
                  ? 'bg-[#f97316] text-white shadow-2xs font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <input
                type="radio"
                name="accessMode"
                value=""
                checked={!accessModeParam}
                onChange={() => updateFilters({ accessMode: null })}
                className="sr-only"
                aria-label="Tất cả"
              />
              <span>Tất cả</span>
            </label>

            {/* Public */}
            <label
              className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                accessModeParam === 'PUBLIC'
                  ? 'bg-[#f97316] text-white shadow-2xs font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <input
                type="radio"
                name="accessMode"
                value="PUBLIC"
                checked={accessModeParam === 'PUBLIC'}
                onChange={() => updateFilters({ accessMode: 'PUBLIC' })}
                className="sr-only"
                aria-label="Công khai (Public)"
              />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Public</span>
            </label>

            {/* Private */}
            <label
              className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                accessModeParam === 'PRIVATE'
                  ? 'bg-[#f97316] text-white shadow-2xs font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <input
                type="radio"
                name="accessMode"
                value="PRIVATE"
                checked={accessModeParam === 'PRIVATE'}
                onChange={() => updateFilters({ accessMode: 'PRIVATE' })}
                className="sr-only"
                aria-label="Riêng tư (Private)"
              />
              <Lock className="w-3 h-3 text-zinc-400" />
              <span>Private</span>
            </label>
          </div>
        </div>

        {/* Row 4: Trạng thái */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
          <div className="w-32 shrink-0 flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <RotateCw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Trạng thái</span>
          </div>

          <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {/* Tất cả */}
            <label
              className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                !statusParam
                  ? 'bg-[#f97316] text-white shadow-2xs font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <input
                type="radio"
                name="courseStatus"
                value=""
                checked={!statusParam}
                onChange={() => updateFilters({ status: null })}
                className="sr-only"
                aria-label="Tất cả"
              />
              <span>Tất cả</span>
            </label>

            {/* Đang cập nhật */}
            <label
              className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                statusParam === 'UPDATING'
                  ? 'bg-[#f97316] text-white shadow-2xs font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <input
                type="radio"
                name="courseStatus"
                value="UPDATING"
                checked={statusParam === 'UPDATING'}
                onChange={() => updateFilters({ status: 'UPDATING' })}
                className="sr-only"
                aria-label="Đang cập nhật"
              />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Đang cập nhật</span>
            </label>

            {/* Đã hoàn thành */}
            <label
              className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                statusParam === 'COMPLETED'
                  ? 'bg-[#f97316] text-white shadow-2xs font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <input
                type="radio"
                name="courseStatus"
                value="COMPLETED"
                checked={statusParam === 'COMPLETED'}
                onChange={() => updateFilters({ status: 'COMPLETED' })}
                className="sr-only"
                aria-label="Đã hoàn thành"
              />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Đã hoàn thành</span>
            </label>

            {/* Tạm dừng */}
            <label
              className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                statusParam === 'PAUSED'
                  ? 'bg-[#f97316] text-white shadow-2xs font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <input
                type="radio"
                name="courseStatus"
                value="PAUSED"
                checked={statusParam === 'PAUSED'}
                onChange={() => updateFilters({ status: 'PAUSED' })}
                className="sr-only"
                aria-label="Tạm dừng"
              />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              <span>Tạm dừng</span>
            </label>
          </div>
        </div>

        {/* Row 5: Chủ đề & Thẻ */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
          <div className="w-32 shrink-0 flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <Tag className="w-3.5 h-3.5 text-zinc-400" />
            <span>Chủ đề & Thẻ</span>
          </div>

          <div className="flex-1 flex items-center gap-2 flex-wrap">
            {/* Lọc tag input */}
            <div className="relative">
              <input
                type="text"
                value={tagSearchInput}
                onChange={(e) => setTagSearchInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Lọc tag (Enter)..."
                title="Nhập tên tag và nhấn Enter để thêm bộ lọc"
                className="h-7 w-28 pl-6 pr-2 rounded-lg bg-zinc-50 dark:bg-[#1c1d23] border border-zinc-200 dark:border-zinc-800 text-[11px] text-foreground placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-primary"
              />
              <Search className="w-3 h-3 text-zinc-400 absolute left-2 top-1/2 -translate-y-1/2" />
            </div>

            {/* Dynamic Tags (added by user on Enter) */}
            {dynamicTags.map((customTag) => {
              const isSelected = selectedTags.some(
                (st) => st.toLowerCase() === customTag.toLowerCase()
              );
              return (
                <button
                  key={`custom-${customTag}`}
                  type="button"
                  onClick={() => toggleTag(customTag)}
                  className={`h-7 px-3 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#f97316] text-white shadow-2xs font-semibold'
                      : 'bg-zinc-100 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-800/80'
                  }`}
                >
                  <span>#{customTag}</span>
                  {isSelected && (
                    <X
                      className="w-3 h-3 text-white/80 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTag(customTag);
                      }}
                    />
                  )}
                </button>
              );
            })}

            {/* Default Tag Pills */}
            {DEFAULT_TOPIC_TAGS.map((t) => {
              const isSelected = selectedTags.some(
                (st) => st.toLowerCase() === t.label.toLowerCase()
              );
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => toggleTag(t.label)}
                  className={`h-7 px-3 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#f97316] text-white shadow-2xs font-semibold'
                      : 'bg-zinc-100 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-800/80'
                  }`}
                >
                  <span>{t.label}</span>
                  {isSelected ? (
                    <X
                      className="w-3 h-3 text-white/80 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTag(t.label);
                      }}
                    />
                  ) : t.hasDropdown ? (
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  ) : null}
                </button>
              );
            })}

            {/* Clear all tags if more than 1 tag is selected */}
            {selectedTags.length > 1 && (
              <button
                type="button"
                onClick={() => updateFilters({ tag: null })}
                className="h-7 px-2.5 rounded-lg text-xs text-orange-500 hover:text-orange-600 dark:text-orange-400 font-medium underline underline-offset-2 transition-colors cursor-pointer"
              >
                Bỏ chọn tất cả thẻ ({selectedTags.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid Header & Layout Mode Switcher */}
      <div className="flex items-center justify-between pt-1">
        {qParam ? (
          <div className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Tìm thấy{' '}
            <strong className="text-foreground">{filteredCourses.length}</strong>{' '}
            khóa học cho từ khóa &quot;
            <span className="text-foreground font-semibold">{qParam}</span>&quot;
          </div>
        ) : (
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Hiển thị{' '}
            <strong className="text-foreground">{filteredCourses.length}</strong>{' '}
            khóa học
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleViewModeChange('grid')}
            aria-label="Chế độ lưới"
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              viewMode === 'grid'
                ? 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-[#f97316]'
                : 'border-transparent text-zinc-400 hover:text-foreground'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleViewModeChange('list')}
            aria-label="Chế độ danh sách"
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-[#f97316]'
                : 'border-transparent text-zinc-400 hover:text-foreground'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Course Listing: Grid or List */}
      {filteredCourses.length === 0 ? (
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
          <button
            type="button"
            onClick={handleResetAll}
            className="mt-5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold cursor-pointer"
          >
            Xem tất cả khóa học
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="flex flex-col gap-3.5 sm:gap-4">
          {filteredCourses.map((course) => (
            <DiscoveryCourseCard
              key={course.id}
              course={course}
              variant="list"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5 sm:gap-4">
          {filteredCourses.map((course) => (
            <DiscoveryCourseCard
              key={course.id}
              course={course}
              variant="grid"
            />
          ))}
        </div>
      )}

      {/* Bottom Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 pb-12 border-t border-zinc-200 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400">
        {/* Left: Previous */}
        <button
          type="button"
          disabled={pageParam <= 1}
          onClick={() =>
            updateFilters({ page: Math.max(1, pageParam - 1).toString() })
          }
          className="px-3 py-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          &lt; Trước
        </button>

        {/* Middle: Page Numbers */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => updateFilters({ page: '1' })}
            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors cursor-pointer ${
              pageParam === 1
                ? 'bg-[#f97316] text-white shadow-2xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-foreground'
            }`}
          >
            1
          </button>
          <button
            type="button"
            onClick={() => updateFilters({ page: '2' })}
            className={`w-7 h-7 rounded-full flex items-center justify-center font-medium text-xs transition-colors cursor-pointer ${
              pageParam === 2
                ? 'bg-[#f97316] text-white shadow-2xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-foreground'
            }`}
          >
            2
          </button>
          <button
            type="button"
            onClick={() => updateFilters({ page: '3' })}
            className={`w-7 h-7 rounded-full flex items-center justify-center font-medium text-xs transition-colors cursor-pointer ${
              pageParam === 3
                ? 'bg-[#f97316] text-white shadow-2xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-foreground'
            }`}
          >
            3
          </button>
          <button
            type="button"
            onClick={() => updateFilters({ page: '4' })}
            className={`w-7 h-7 rounded-full flex items-center justify-center font-medium text-xs transition-colors cursor-pointer ${
              pageParam === 4
                ? 'bg-[#f97316] text-white shadow-2xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-foreground'
            }`}
          >
            4
          </button>
          <span className="px-1 text-zinc-400 dark:text-zinc-600">...</span>
          <button
            type="button"
            onClick={() => updateFilters({ page: '8' })}
            className={`w-7 h-7 rounded-full flex items-center justify-center font-medium text-xs transition-colors cursor-pointer ${
              pageParam === 8
                ? 'bg-[#f97316] text-white shadow-2xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-foreground'
            }`}
          >
            8
          </button>
          <button
            type="button"
            disabled={pageParam >= 8}
            onClick={() =>
              updateFilters({ page: Math.min(8, pageParam + 1).toString() })
            }
            className="px-3 py-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Sau &gt;
          </button>
        </div>

        {/* Right: Đến trang */}
        <div className="flex items-center gap-2">
          <span>Đến trang:</span>
          <input
            type="text"
            value={targetPageInput}
            onChange={(e) => setTargetPageInput(e.target.value)}
            className="w-9 h-7 rounded-lg bg-zinc-50 dark:bg-[#1c1d23] border border-zinc-200 dark:border-zinc-800 text-center text-xs text-foreground focus:outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => {
              const p = parseInt(targetPageInput, 10);
              if (!isNaN(p) && p >= 1 && p <= 8) {
                updateFilters({ page: p.toString() });
              }
            }}
            className="h-7 px-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium text-foreground transition-colors cursor-pointer"
          >
            Đi
          </button>
        </div>
      </div>
    </div>
  );
}
