import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Home,
  ChevronRight,
  LayoutDashboard,
  BookOpen,
  Users,
  CheckSquare,
  GraduationCap,
  BarChart3,
  Search,
  PlusCircle,
  Plus,
  BadgeCheck,
  FileText,
  ShieldCheck,
  KeyRound,
  ExternalLink,
  Edit3,
  Trash2,
  MoreVertical,
  History,
  Lock,
  X,
  ChevronLeft,
  Upload,
} from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Skeleton,
  EmptyState,
  ErrorState,
  useToast,
} from '@/shared/ui';
import { useCourseQuery } from '@/features/course/api/courseApi';
import {
  useChaptersQuery,
  useDeleteChapterMutation,
  usePublishChapterActionMutation,
  useChapterDraftQuery,
  type ChapterSummary,
} from '../api/contentApi';
import { ChapterVersionsModal } from '../components/ChapterVersionsModal';
import { ChapterPreviewModal } from '../components/ChapterPreviewModal';

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '12/10/2026 14:30';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return String(dateStr);
  }
}

function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return '2 giờ trước';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Vừa xong';
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Hôm qua';
    return `${days} ngày trước`;
  } catch {
    return '2 giờ trước';
  }
}

export function ChapterListPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { pushToast } = useToast();

  // Queries & Mutations
  const { data: course, isLoading: isCourseLoading } = useCourseQuery(courseId);
  const {
    data: chapters = [],
    isLoading: isChaptersLoading,
    isError,
    error,
    refetch,
  } = useChaptersQuery(courseId);

  const { mutateAsync: deleteChapter } = useDeleteChapterMutation(courseId);
  const { mutateAsync: publishChapter } = usePublishChapterActionMutation(courseId);

  // Filter & Search states: Only 2 tabs (PUBLISHED and DRAFT), default PUBLISHED
  const [filterTab, setFilterTab] = useState<'PUBLISHED' | 'DRAFT'>('PUBLISHED');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5; // Cố định 5 mục/trang, không dùng dropdown
  const [isOnlyMeNoticeVisible, setIsOnlyMeNoticeVisible] = useState(true);

  // Dialog & Modal states
  const [deletingChapter, setDeletingChapter] = useState<ChapterSummary | null>(null);
  const [historyChapterId, setHistoryChapterId] = useState<string | null>(null);
  const [previewChapterId, setPreviewChapterId] = useState<string | null>(null);

  // Draft query for preview modal
  const { data: previewDraft } = useChapterDraftQuery(courseId, previewChapterId || '');

  // Filtered chapters: strictly by active tab (Chương đã đăng tải vs Chương nháp) and search query
  const filteredChapters = useMemo(() => {
    return chapters.filter((ch) => {
      // Status tab filter: PUBLISHED vs DRAFT
      if (filterTab === 'PUBLISHED' && ch.status !== 'PUBLISHED') return false;
      if (filterTab === 'DRAFT' && ch.status !== 'DRAFT') return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const titleMatch = ch.title?.toLowerCase().includes(q);
        const descMatch = ch.description?.toLowerCase().includes(q);
        if (!titleMatch && !descMatch) return false;
      }

      return true;
    });
  }, [chapters, filterTab, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredChapters.length / pageSize));
  const paginatedChapters = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredChapters.slice(startIndex, startIndex + pageSize);
  }, [filteredChapters, currentPage, pageSize]);

  const startIndex = filteredChapters.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredChapters.length);

  // Handlers: Chuyển thẳng sang giao diện Soạn thảo chương toàn màn hình
  const handleOpenCreateModal = () => {
    navigate(`/courses/${courseId}/manage/content/new`);
  };

  const handleInsertAfter = (ch: ChapterSummary) => {
    navigate(`/courses/${courseId}/manage/content/new?after=${ch.id}`);
  };

  const handleConfirmDelete = async () => {
    if (!deletingChapter?.id) return;

    try {
      await deleteChapter(deletingChapter.id);
      pushToast({
        title: 'Đã xóa chương',
        description: `Chương "${deletingChapter.title}" đã được xóa mềm.`,
        tone: 'success',
      });
      setDeletingChapter(null);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'detail' in err
          ? String((err as { detail?: string }).detail)
          : err instanceof Error
          ? err.message
          : 'Không thể xóa chương này.';
      pushToast({
        title: 'Xóa chương thất bại',
        description: msg,
        tone: 'error',
      });
    }
  };

  const handlePublish = async (chapterId: string) => {
    try {
      await publishChapter(chapterId);
      pushToast({
        title: 'Đã đăng tải chương',
        description: 'Chương bài học đã được xuất bản công khai cho học viên.',
        tone: 'success',
      });
      setFilterTab('PUBLISHED');
    } catch {
      pushToast({
        title: 'Thao tác thất bại',
        description: 'Không thể xuất bản chương vào lúc này.',
        tone: 'error',
      });
    }
  };

  const courseTitle = course?.name || 'Khóa học do tôi biên soạn';

  if (isChaptersLoading || isCourseLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-10 w-full rounded-full" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <ErrorState
          title="Không thể tải mục lục chương bài học"
          error={error}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 text-foreground">
      {/* 1. TOP BREADCRUMB: Thống nhất "Trang chủ / Khóa học Ten-Khoa-Hoc" */}
      <nav
        aria-label="Đường dẫn điều hướng"
        className="flex items-center gap-2 text-xs text-muted-foreground"
      >
        <Link
          to="/manage/courses"
          className="hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <Home className="h-3.5 w-3.5" />
          <span>Trang chủ</span>
        </Link>
        <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
        <span className="font-semibold text-foreground truncate max-w-[320px] sm:max-w-md">
          Khóa học {courseTitle}
        </span>
      </nav>

      {/* 2. SUB-NAVIGATION TABS: Thống nhất dùng chung thanh tab bar của trang Tổng quan */}
      <div className="border-b border-border/70 pb-3 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {/* Link Tab: Tổng quan */}
          <Link
            to={`/courses/${courseId}/manage`}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Tổng quan</span>
          </Link>

          {/* Active Tab: Danh sách chương (Pill cam thống nhất) */}
          <div className="bg-[#ff7a1a] text-[#5e2700] flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm shadow-xs select-none">
            <BookOpen className="h-4 w-4" />
            <span>Danh sách chương</span>
          </div>

          {/* Link Tab: Danh sách học viên */}
          <button
            type="button"
            onClick={() =>
              pushToast({
                title: 'Quản lý học viên',
                description: 'Mô-đun quản lý học viên chi tiết thuộc phạm vi Slice 4 (S4).',
                tone: 'default',
              })
            }
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Users className="h-4 w-4" />
            <span>Danh sách học viên</span>
          </button>

          {/* Link Tab: Chấm điểm (badge 12) */}
          <button
            type="button"
            onClick={() =>
              pushToast({
                title: 'Hệ thống chấm điểm',
                description: 'Hàng đợi chấm thi & bảng điểm thuộc phạm vi Slice 8 (S8).',
                tone: 'default',
              })
            }
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <CheckSquare className="h-4 w-4" />
            <span>Chấm điểm</span>
            <span className="bg-[#93000a] text-[#ffdad6] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              12
            </span>
          </button>

          {/* Link Tab: Chuẩn đầu ra */}
          <button
            type="button"
            onClick={() =>
              pushToast({
                title: 'Chuẩn đầu ra (CLO/PLO)',
                description: 'Hệ thống quản lý chuẩn đầu ra thuộc phạm vi Slice 9 (S9).',
                tone: 'default',
              })
            }
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <GraduationCap className="h-4 w-4" />
            <span>Chuẩn đầu ra</span>
          </button>

          {/* Link Tab: Thống kê */}
          <button
            type="button"
            onClick={() =>
              pushToast({
                title: 'Báo cáo thống kê',
                description: 'Hệ thống phân tích & xuất báo cáo chi tiết thuộc phạm vi Slice 9 (S9).',
                tone: 'default',
              })
            }
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Thống kê</span>
          </button>
        </div>
      </div>

      {/* 3. ONLY ME NOTICE BANNER (Chỉ hiển thị khi khóa học ở chế độ ONLY_ME) */}
      {isOnlyMeNoticeVisible && course?.accessMode === 'ONLY_ME' && (
        <div className="relative rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all flex items-start gap-3.5">
          <div className="h-9 w-9 shrink-0 rounded-xl bg-[#ff7a1a]/15 text-[#ff7a1a] flex items-center justify-center border border-[#ff7a1a]/30">
            <Lock className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-foreground">Lưu ý chế độ hiển thị</h4>
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground border border-border">
                Khóa học Only Me
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Khóa học hiện cài đặt chế độ <strong className="text-foreground">Only Me</strong>: Cấu
              hình truy cập từng chương (Public/Protected) chỉ hiển thị để thử nghiệm và sẽ không có
              hiệu lực với người học bên ngoài (toàn bộ nội dung ở trạng thái riêng tư của tác giả).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOnlyMeNoticeVisible(false)}
            aria-label="Đóng thông báo"
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors absolute top-4 right-4"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 4. MAIN TOOLBAR (Không có nút Thư viện tài nguyên) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            aria-label="Mục lục chương & bài học"
            className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2"
          >
            <span>Danh sách chương</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Box */}
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Tìm chương học"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-3 h-9 text-xs rounded-xl bg-card border-border"
            />
          </div>

          {/* Add Chapter Button */}
          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreateModal}
            className="bg-[#ff7a1a] hover:bg-[#ff7a1a]/90 text-[#5e2700] text-xs font-bold h-9 px-4 rounded-full shadow-xs"
          >
            <PlusCircle className="h-4 w-4 mr-1.5" />
            <span>Thêm chương mới</span>
          </Button>
        </div>
      </div>

      {/* 5. STATUS SWITCHER TABS: Chỉ có 2 tab (không có Tất cả, không hiển thị số lượng) */}
      <div className="flex items-center gap-6 border-b border-border/70 pb-1">
        <button
          type="button"
          onClick={() => {
            setFilterTab('PUBLISHED');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 pb-2 text-sm font-semibold transition-all relative ${
            filterTab === 'PUBLISHED'
              ? 'text-[#ff7a1a] border-b-2 border-[#ff7a1a]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BadgeCheck className="h-4 w-4 text-[#ff7a1a]" />
          <span>Chương đã đăng tải</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setFilterTab('DRAFT');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 pb-2 text-sm font-semibold transition-all relative ${
            filterTab === 'DRAFT'
              ? 'text-[#ff7a1a] border-b-2 border-[#ff7a1a]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Chương nháp</span>
        </button>
      </div>

      {/* 6. CHAPTERS TABLE: Cột TÊN CHƯƠNG (chỉ hiển thị tên, không có mô tả hay badge bên dưới) */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {filteredChapters.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={
                filterTab === 'PUBLISHED'
                  ? 'Chưa có chương nào được đăng tải'
                  : 'Không có chương nháp nào'
              }
              description={
                filterTab === 'PUBLISHED'
                  ? 'Đăng tải các chương nháp để học viên có thể bắt đầu học tập.'
                  : 'Bắt đầu soạn thảo chương mới bằng cách bấm vào nút Thêm chương mới.'
              }
              action={
                <Button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="bg-[#ff7a1a] hover:bg-[#ff7a1a]/90 text-[#5e2700] text-xs font-bold rounded-full"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  <span>Thêm chương mới</span>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4 text-center w-16">STT</th>
                  <th className="py-3 px-4">TÊN CHƯƠNG</th>
                  <th className="py-3 px-4 text-center w-36">TRUY CẬP</th>
                  <th className="py-3 px-4 w-48">NGÀY ĐĂNG / LƯU</th>
                  <th className="py-3 px-4 text-right w-36">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {paginatedChapters.map((ch) => {
                  const fullIndex = chapters.findIndex((c) => c.id === ch.id);
                  const sttDisplay = String(ch.position ?? fullIndex + 1).padStart(2, '0');

                  return (
                    <tr
                      key={ch.id}
                      data-testid={`chapter-item-${ch.id}`}
                      className="hover:bg-muted/20 transition-colors group"
                    >
                      {/* Cột 1: STT */}
                      <td className="py-4 px-4 text-center align-middle">
                        <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center font-mono text-xs font-bold text-foreground mx-auto">
                          {sttDisplay}
                        </div>
                      </td>

                      {/* Cột 2: TÊN CHƯƠNG (chỉ hiển thị tên chương, không có mô tả hay badge trạng thái) */}
                      <td className="py-4 px-4 align-middle">
                        <Link
                          to={`/courses/${courseId}/manage/content/${ch.id}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors block text-sm"
                        >
                          {ch.title}
                        </Link>
                      </td>

                      {/* Cột 3: TRUY CẬP */}
                      <td className="py-4 px-4 text-center align-middle">
                        {ch.accessMode === 'PROTECTED' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/80 border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300">
                            <KeyRound className="h-3.5 w-3.5 text-zinc-400" />
                            <span>Protected</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-medium text-emerald-400">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Public</span>
                          </span>
                        )}
                      </td>

                      {/* Cột 4: NGÀY ĐĂNG / LƯU */}
                      <td className="py-4 px-4 align-middle text-xs">
                        {ch.status === 'PUBLISHED' ? (
                          <div>
                            <p className="font-medium text-foreground">
                              {formatDate((ch as any).publishedAt || (ch as any).updatedAt)}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Bởi {(ch as any).authorName || course?.owner?.displayName || 'Admin'}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium text-muted-foreground">Chưa đăng tải</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Lưu nháp: {formatTimeAgo((ch as any).updatedAt)}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Cột 5: THAO TÁC (Bỏ nút di chuyển lên/xuống) */}
                      <td className="py-4 px-4 text-right align-middle">
                        <div className="flex items-center justify-end gap-1">
                          {/* 1. Nút xem trước */}
                          <button
                            type="button"
                            title="Xem trước nội dung"
                            aria-label={`Xem trước chương ${ch.title}`}
                            onClick={() => setPreviewChapterId(ch.id!)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>

                          {/* 2. Nút chỉnh sửa */}
                          <Link
                            to={`/courses/${courseId}/manage/content/${ch.id}`}
                            title="Chỉnh sửa nội dung"
                            aria-label={`Chỉnh sửa chương ${ch.title}`}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Link>

                          {/* 3. Nút xóa */}
                          <button
                            type="button"
                            title="Xóa chương"
                            aria-label={`Xóa chương ${ch.title}`}
                            onClick={() => setDeletingChapter(ch)}
                            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          {/* 4. Menu thao tác khác */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                title="Thao tác khác"
                                aria-label={`Thao tác khác cho ${ch.title}`}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              {/* Thêm chức năng: Chèn chương sau */}
                              <DropdownMenuItem onClick={() => handleInsertAfter(ch)}>
                                <Plus className="h-4 w-4 mr-2 text-primary" />
                                <span>Chèn chương sau</span>
                              </DropdownMenuItem>

                              {/* Lịch sử phiên bản */}
                              <DropdownMenuItem onClick={() => setHistoryChapterId(ch.id!)}>
                                <History className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>Lịch sử phiên bản</span>
                              </DropdownMenuItem>

                              {/* Đăng tải chương ngay (nếu là nháp) */}
                              {ch.status === 'DRAFT' && (
                                <DropdownMenuItem onClick={() => handlePublish(ch.id!)}>
                                  <Upload className="h-4 w-4 mr-2 text-emerald-400" />
                                  <span>Đăng tải chương ngay</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 7. PAGINATION FOOTER (Không có dropdown 5 mục/trang) */}
        {filteredChapters.length > 0 && (
          <div className="border-t border-border/70 p-4 bg-muted/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
            {/* Left: Info */}
            <div className="flex items-center gap-3 text-muted-foreground">
              <span>
                Hiển thị <strong className="text-foreground">{startIndex}</strong> -{' '}
                <strong className="text-foreground">{endIndex}</strong> của{' '}
                <strong className="text-foreground">{filteredChapters.length}</strong> chương
              </span>
            </div>

            {/* Right: Page navigation buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Trang trước"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-20 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                const isActive = pageNum === currentPage;

                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center font-semibold text-xs transition-colors ${
                      isActive
                        ? 'bg-[#ff7a1a] text-[#5e2700] font-bold shadow-xs'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Trang sau"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-20 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>



      {/* 9. MODAL: CONFIRM SOFT DELETE */}
      <Dialog
        open={Boolean(deletingChapter)}
        onOpenChange={(open) => !open && setDeletingChapter(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa chương?</DialogTitle>
            <DialogDescription>
              Hành động này sẽ xóa mềm chương bài học{' '}
              <strong className="text-foreground">"{deletingChapter?.title}"</strong>. Mọi khối nội
              dung trong chương sẽ tạm thời bị ẩn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingChapter(null)}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleConfirmDelete}
              className="text-xs font-semibold"
            >
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 10. MODAL: VERSION HISTORY */}
      {historyChapterId && (
        <ChapterVersionsModal
          isOpen={Boolean(historyChapterId)}
          onClose={() => setHistoryChapterId(null)}
          courseId={courseId}
          chapterId={historyChapterId}
        />
      )}

      {/* 11. MODAL: CHAPTER PREVIEW */}
      {previewChapterId && (
        <ChapterPreviewModal
          isOpen={Boolean(previewChapterId)}
          onClose={() => setPreviewChapterId(null)}
          chapterTitle={previewDraft?.title || 'Xem trước chương bài học'}
          chapterDescription={previewDraft?.description}
          blocks={previewDraft?.blocks || []}
        />
      )}
    </div>
  );
}
