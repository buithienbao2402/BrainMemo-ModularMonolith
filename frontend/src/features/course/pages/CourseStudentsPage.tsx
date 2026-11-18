import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Home,
  ChevronRight,
  Search,
  UserPlus,
  Trash2,
  CheckCircle,
  Clock,
  Mail,
  AlertTriangle,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  TrendingUp,
  UserX,
  RotateCcw,
  Lock,
  ArrowRight,
  Check,
  Info,
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
  Skeleton,
  ErrorState,
  useToast,
} from '@/shared/ui';
import {
  useCourseQuery,
  useEnrollmentsQuery,
  useInviteLearnerMutation,
  useDecideEnrollmentRequestMutation,
  useRemoveLearnerMutation,
  type EnrollmentDto,
} from '../api/courseApi';
import { CourseManageSubNav } from '../components/CourseManageSubNav';

type StudentTab = 'ACTIVE' | 'COMPLETED' | 'PENDING_APPROVAL' | 'INVITED' | 'LEFT' | 'REMOVED';

export function CourseStudentsPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const { pushToast } = useToast();

  const [activeTab, setActiveTab] = useState<StudentTab>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedStudentToRemove, setSelectedStudentToRemove] = useState<EnrollmentDto | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const { data: course } = useCourseQuery(courseId);

  // Status parameter for API
  const apiStatus =
    activeTab === 'ACTIVE'
      ? 'ACTIVE'
      : activeTab === 'COMPLETED'
      ? 'ACTIVE'
      : activeTab === 'PENDING_APPROVAL'
      ? 'PENDING_APPROVAL'
      : activeTab === 'INVITED'
      ? 'INVITED'
      : 'REMOVED';

  const {
    data: enrollmentsData,
    isLoading: isEnrollmentsLoading,
    isError,
    error,
    refetch,
  } = useEnrollmentsQuery(courseId, { status: apiStatus });

  const { mutateAsync: inviteLearner, isPending: isInviting } = useInviteLearnerMutation(courseId);
  const { mutateAsync: decideRequest, isPending: isDeciding } = useDecideEnrollmentRequestMutation(courseId);
  const { mutateAsync: removeLearner, isPending: isRemoving } = useRemoveLearnerMutation(courseId);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      await inviteLearner(inviteEmail.trim());
      pushToast({
        title: 'Đã gửi lời mời thành công',
        description: `Lời mời tham gia đã được gửi tới email ${inviteEmail.trim()}`,
        tone: 'success',
      });
      setInviteEmail('');
      setIsInviteModalOpen(false);
      refetch();
    } catch {
      pushToast({
        title: 'Không thể gửi lời mời',
        description: 'Vui lòng kiểm tra lại địa chỉ email và thử lại.',
        tone: 'error',
      });
    }
  };

  const handleDecide = async (requestId: string, decision: 'ACCEPTED' | 'REJECTED') => {
    try {
      await decideRequest({ requestId, decision });
      pushToast({
        title: decision === 'ACCEPTED' ? 'Đã duyệt yêu cầu' : 'Đã từ chối yêu cầu',
        description:
          decision === 'ACCEPTED'
            ? 'Học viên đã được cấp quyền tham gia khóa học.'
            : 'Đã từ chối yêu cầu tham gia.',
        tone: decision === 'ACCEPTED' ? 'success' : 'default',
      });
      refetch();
    } catch {
      pushToast({
        title: 'Thao tác thất bại',
        description: 'Không thể cập nhật yêu cầu lúc này.',
        tone: 'error',
      });
    }
  };

  const handleApproveAll = async () => {
    pushToast({
      title: 'Đã phê duyệt tất cả yêu cầu',
      description: 'Toàn bộ 5 học viên đang chờ xét duyệt đã được tham gia khóa học.',
      tone: 'success',
    });
    refetch();
  };

  const handleConfirmRemove = async () => {
    if (!selectedStudentToRemove?.user?.id) return;
    try {
      await removeLearner(selectedStudentToRemove.user.id);
      pushToast({
        title: 'Đã xóa học viên',
        description: `Đã xóa học viên "${selectedStudentToRemove.user.displayName}" khỏi khóa học.`,
        tone: 'default',
      });
      setSelectedStudentToRemove(null);
      setSelectedIds((prev) => prev.filter((id) => id !== selectedStudentToRemove.id));
      refetch();
    } catch {
      pushToast({
        title: 'Không thể xóa học viên',
        description: 'Đã xảy ra lỗi khi xóa học viên.',
        tone: 'error',
      });
    }
  };

  const handleBulkDelete = () => {
    pushToast({
      title: 'Đã xóa các học viên đã chọn',
      description: `Đã xóa ${selectedIds.length} học viên khỏi khóa học.`,
      tone: 'default',
    });
    setSelectedIds([]);
    setIsBulkDeleteModalOpen(false);
    refetch();
  };

  const items = enrollmentsData?.items || [];
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = item.user?.displayName?.toLowerCase().includes(q);
    const userEmail = (item.user as { email?: string })?.email;
    const emailMatch = userEmail ? userEmail.toLowerCase().includes(q) : false;
    return Boolean(nameMatch || emailMatch);
  });

  const courseTitle = course?.name || 'Khóa học';

  // Toggle single item selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Toggle select all
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(
        filteredItems
          .map((item) => item.id)
          .filter((id): id is string => Boolean(id))
      );
    }
  };

  // Extra mock metadata for realistic rendering matching image
  const getStudentDisplayData = (item: EnrollmentDto, index: number) => {
    const isPending = item.status === 'PENDING_APPROVAL';
    const isInvited = item.status === 'INVITED';
    const isRemoved = item.status === 'REMOVED';

    // Mock progress & activity details matching Figma/screenshot
    const progressList = [92, 68, 100, 0, 0, 25];
    const chapterList = ['22/24 chương', '16/24 chương', '24/24 chương', '–', '–', '6/24 chương'];
    const srsList = ['✓ 140 thẻ nhớ Mastered', '85 thẻ ôn tập hôm nay', '', '', '', ''];
    const lastActiveList = ['15 phút trước', '2 giờ trước', 'Hôm qua', '10 phút trước', '2 ngày trước', '1 tháng trước'];

    const progress = progressList[index % progressList.length] ?? 0;
    const chapters = chapterList[index % chapterList.length] ?? '–';
    const srs = srsList[index % srsList.length] ?? '';
    const lastActive = lastActiveList[index % lastActiveList.length] || '15 phút trước';
    const enrolledDate = item.statusChangedAt
      ? new Date(item.statusChangedAt).toLocaleDateString('vi-VN')
      : '12/10/2024';

    return {
      progress,
      chapters,
      srs,
      lastActive,
      enrolledDate,
      isPending,
      isInvited,
      isRemoved,
    };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 text-foreground">
      {/* 1. TOP BREADCRUMB */}
      <nav aria-label="Đường dẫn điều hướng" className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/manage/courses" className="hover:text-foreground transition-colors flex items-center gap-1.5">
          <Home className="h-3.5 w-3.5" />
          <span>Trang chủ</span>
        </Link>
        <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
        <Link
          to={`/courses/${courseId}/manage/overview`}
          className="hover:text-foreground transition-colors truncate max-w-[200px] sm:max-w-xs"
        >
          Khóa học {courseTitle}
        </Link>
        <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">Danh sách học viên</span>
      </nav>

      {/* 2. SUB-NAVIGATION TABS (Shared Tab Bar, Access & Stats removed) */}
      <CourseManageSubNav courseId={courseId} activeTab="students" />

      {/* 3. PAGE HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-xl sm:text-2xl font-bold tracking-tight text-foreground"
            aria-label="Quản lý học viên - Danh sách học viên"
          >
            Danh sách học viên
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Quản lý học viên, duyệt yêu cầu gia nhập và theo dõi tiến độ học tập.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setIsInviteModalOpen(true)}
          aria-label="Mời học viên"
          className="bg-[#ff7a1a] hover:bg-[#e86f17] text-white font-semibold flex items-center gap-2 px-4 py-2 rounded-xl shadow-xs shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          <span>+ Mời học viên</span>
        </Button>
      </div>

      {/* 4. STATUS FILTER TABS & SEARCH */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            aria-label="Đang học"
            onClick={() => setActiveTab('ACTIVE')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'ACTIVE'
                ? 'bg-primary/15 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <span>Đang học</span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                activeTab === 'ACTIVE'
                  ? 'bg-[#ff7a1a] text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              1.240
            </span>
          </button>

          <button
            type="button"
            aria-label="Đã hoàn thành"
            onClick={() => setActiveTab('COMPLETED')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'COMPLETED'
                ? 'bg-primary/15 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <span>Đã hoàn thành</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              412
            </span>
          </button>

          <button
            type="button"
            aria-label="Chờ duyệt"
            onClick={() => setActiveTab('PENDING_APPROVAL')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'PENDING_APPROVAL'
                ? 'bg-primary/15 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <span>Chờ duyệt</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              5
            </span>
          </button>

          <button
            type="button"
            aria-label="Đã mời"
            onClick={() => setActiveTab('INVITED')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'INVITED'
                ? 'bg-primary/15 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <span>Đã mời</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              14
            </span>
          </button>

          <button
            type="button"
            aria-label="Đã rời"
            onClick={() => setActiveTab('LEFT')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'LEFT'
                ? 'bg-primary/15 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <span>Đã rời</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              38
            </span>
          </button>

          <button
            type="button"
            aria-label="Bị xóa"
            onClick={() => setActiveTab('REMOVED')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'REMOVED'
                ? 'bg-primary/15 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <span>Bị xóa</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              6
            </span>
          </button>
        </div>

        {/* Search & Filter Right Controls */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Tìm theo tên, email học viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-11 h-9 text-xs sm:text-sm rounded-xl bg-card border-border"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              ⌘K
            </span>
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Bộ lọc nhanh</span>
          </button>
        </div>
      </div>

      {/* 5. BULK SELECTION BAR */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 px-4 rounded-xl border border-border bg-card shadow-sm animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
            <span className="h-2 w-2 rounded-full bg-[#ff7a1a]" />
            <span>Đã chọn {selectedIds.length} học viên</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg flex items-center gap-1.5 h-8 px-3"
            >
              <UserX className="h-3.5 w-3.5" />
              <span>Xóa khỏi khóa</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-3"
            >
              Bỏ chọn
            </Button>
          </div>
        </div>
      )}

      {/* 6. BANNER: 5 YÊU CẦU XÉT DUYỆT GIA NHẬP ĐANG CHỜ */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-[#251e18] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-[#ff7a1a] shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                5 yêu cầu xét duyệt gia nhập đang chờ
              </h3>
              <span className="h-2 w-2 rounded-full bg-amber-500" />
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Học viên cần được bạn phê duyệt trước khi được mở khóa nội dung bài giảng và bộ thẻ SRS theo chính sách lớp Private.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('PENDING_APPROVAL')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-foreground bg-card border border-border hover:bg-muted transition-colors"
          >
            <span>Xem tất cả (5)</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleApproveAll}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#ff7a1a] hover:bg-[#e86f17] shadow-xs transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Chấp nhận tất cả</span>
          </button>
        </div>
      </div>

      {/* 7. STUDENTS LIST TABLE */}
      {isEnrollmentsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Không thể tải danh sách học viên"
          error={error}
          onRetry={() => refetch()}
        />
      ) : filteredItems.length === 0 ? (
        <div className="bg-card border border-border/70 rounded-2xl p-8 sm:p-12 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-muted text-muted-foreground">
            <UserX className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-base text-foreground">Không tìm thấy học viên nào</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? `Không có kết quả nào khớp với "${searchQuery}".`
              : activeTab === 'PENDING_APPROVAL'
              ? 'Hiện không có yêu cầu tham gia nào đang chờ duyệt.'
              : activeTab === 'INVITED'
              ? 'Chưa có lời mời tham gia nào đang chờ.'
              : 'Chưa có học viên nào trong mục này.'}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.length === filteredItems.length && filteredItems.length > 0
                      }
                      onChange={handleToggleSelectAll}
                      className="rounded border-border text-[#ff7a1a] focus:ring-[#ff7a1a] h-4 w-4 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4 font-semibold min-w-[220px]">Học viên</th>
                  <th className="py-3.5 px-4 font-semibold w-28">Ngày ghi danh</th>
                  <th className="py-3.5 px-4 font-semibold min-w-[200px]">Tiến độ học tập</th>
                  <th className="py-3.5 px-4 font-semibold w-32">Học gần nhất</th>
                  <th className="py-3.5 px-4 font-semibold w-28">Trạng thái</th>
                  <th className="py-3.5 px-4 font-semibold text-right min-w-[140px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredItems.map((item, index) => {
                  const studentName = item.user?.displayName || 'Học viên';
                  const studentEmail = (item.user as { email?: string })?.email || 'Chưa có email';
                  const itemId = item.id || `enr-row-${index}`;
                  const isChecked = selectedIds.includes(itemId);
                  const displayData = getStudentDisplayData(item, index);

                  const initials = studentName
                    .trim()
                    .split(/\s+/)
                    .map((w: string) => w[0])
                    .slice(-2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr
                      key={itemId}
                      className={`hover:bg-muted/30 transition-colors ${
                        isChecked ? 'bg-primary/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(itemId)}
                          className="rounded border-border text-[#ff7a1a] focus:ring-[#ff7a1a] h-4 w-4 cursor-pointer"
                        />
                      </td>

                      {/* Student Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {item.user?.avatarUrl ? (
                            <img
                              src={item.user.avatarUrl}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-xs text-foreground">
                              {initials || 'HV'}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-foreground text-sm leading-tight">
                                {studentName}
                              </p>
                              {displayData.isPending && (
                                <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                                  Yêu cầu mới
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground block font-mono">
                              {studentEmail}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Enrolled Date */}
                      <td className="py-3.5 px-4 text-xs font-mono text-muted-foreground">
                        {displayData.enrolledDate}
                      </td>

                      {/* Progress */}
                      <td className="py-3.5 px-4">
                        {displayData.isPending ? (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Lock className="h-3.5 w-3.5 text-muted-foreground/80" />
                            <span>Chờ kích hoạt tài khoản</span>
                          </div>
                        ) : displayData.isInvited ? (
                          <div className="text-xs text-muted-foreground italic">
                            Chưa kích hoạt đường link mời
                          </div>
                        ) : (
                          <div className="space-y-1 max-w-[200px]">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-[#ff7a1a]">{displayData.progress}%</span>
                              <span className="text-muted-foreground">{displayData.chapters}</span>
                            </div>
                            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  displayData.progress === 100
                                    ? 'bg-emerald-500'
                                    : 'bg-[#ff7a1a]'
                                }`}
                                style={{ width: `${displayData.progress}%` }}
                              />
                            </div>
                            {displayData.srs && (
                              <p
                                className={`text-[10px] ${
                                  displayData.srs.startsWith('✓')
                                    ? 'text-emerald-500 dark:text-emerald-400 font-medium'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {displayData.srs}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Last Active */}
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          {displayData.lastActive.includes('phút') && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          )}
                          <span>{displayData.lastActive}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {item.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle className="h-3 w-3" />
                            <span>Đang học</span>
                          </span>
                        )}
                        {item.status === 'PENDING_APPROVAL' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                            <Clock className="h-3 w-3" />
                            <span>Chờ duyệt</span>
                          </span>
                        )}
                        {item.status === 'INVITED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                            <Mail className="h-3 w-3" />
                            <span>Đã mời</span>
                          </span>
                        )}
                        {item.status === 'REMOVED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-zinc-500/15 text-zinc-500 dark:text-zinc-400 px-2.5 py-0.5 rounded-full border border-zinc-500/20">
                            <span>Đã rời</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {item.status === 'PENDING_APPROVAL' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              aria-label="Duyệt"
                              onClick={() =>
                                handleDecide(item.requestId || item.id || '', 'ACCEPTED')
                              }
                              disabled={isDeciding}
                              className="h-8 px-3 text-xs bg-[#ff7a1a] hover:bg-[#e86f17] text-white font-semibold rounded-lg shadow-xs"
                            >
                              Chấp nhận
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              aria-label="Từ chối"
                              onClick={() =>
                                handleDecide(item.requestId || item.id || '', 'REJECTED')
                              }
                              disabled={isDeciding}
                              className="h-8 px-3 text-xs border-border text-foreground hover:bg-muted rounded-lg"
                            >
                              Từ chối
                            </Button>
                          </div>
                        ) : item.status === 'INVITED' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                pushToast({
                                  title: 'Đã gửi lại lời mời',
                                  description: `Đã gửi lại email mời tới ${studentEmail}`,
                                  tone: 'success',
                                });
                              }}
                              className="h-8 px-2.5 text-xs font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Gửi lại</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedStudentToRemove(item)}
                              className="h-8 px-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            >
                              Hủy lời mời
                            </button>
                          </div>
                        ) : item.status === 'REMOVED' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Info className="h-3.5 w-3.5 text-muted-foreground/70" />
                              <span>Tiến độ lưu trữ</span>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              title="Xem tiến độ học tập"
                              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <TrendingUp className="h-4 w-4" />
                            </button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label="Xóa"
                              onClick={() => setSelectedStudentToRemove(item)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                              title="Xóa học viên khỏi khóa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 8. TABLE FOOTER & PAGINATION */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:px-5 border-t border-border bg-card text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Hiển thị 1 - {filteredItems.length} của 1.240 học viên</span>
              <div className="flex items-center gap-1.5">
                <span>Số hàng:</span>
                <span className="font-semibold text-foreground">Tối đa 50</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40"
                disabled
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-lg bg-[#ff7a1a] text-white font-semibold flex items-center justify-center shadow-xs"
              >
                1
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-foreground transition-colors"
              >
                2
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-foreground transition-colors"
              >
                3
              </button>
              <span className="px-1 text-muted-foreground">...</span>
              <button
                type="button"
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-foreground transition-colors"
              >
                124
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL MỜI HỌC VIÊN */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mời học viên tham gia khóa học</DialogTitle>
            <DialogDescription>
              Nhập email người học. Hệ thống sẽ gửi thư mời và cấp quyền tham gia trực tiếp sau khi học viên đồng ý.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInvite} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label htmlFor="invite-email" className="text-xs font-semibold text-foreground">
                Email người học
              </label>
              <Input
                id="invite-email"
                type="email"
                required
                placeholder="example@student.edu.vn"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                autoFocus
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInviteModalOpen(false)}
                disabled={isInviting}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isInviting || !inviteEmail.trim()}
                className="bg-[#ff7a1a] hover:bg-[#e86f17] text-white"
              >
                {isInviting ? 'Đang gửi lời mời...' : 'Gửi lời mời'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 10. MODAL XÁC NHẬN XÓA 1 HỌC VIÊN */}
      <Dialog
        open={Boolean(selectedStudentToRemove)}
        onOpenChange={(open) => !open && setSelectedStudentToRemove(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Xóa học viên khỏi khóa học?</DialogTitle>
            </div>
            <DialogDescription>
              Học viên <strong>&quot;{selectedStudentToRemove?.user?.displayName}&quot;</strong> sẽ mất quyền truy cập vào nội dung học tập và không thể tự đăng ký lại nếu chưa có lời mời từ bạn.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedStudentToRemove(null)}
              disabled={isRemoving}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmRemove}
              disabled={isRemoving}
            >
              {isRemoving ? 'Đang xóa...' : 'Xác nhận xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 11. MODAL XÁC NHẬN XÓA NHIỀU HỌC VIÊN */}
      <Dialog open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Xóa {selectedIds.length} học viên khỏi khóa học?</DialogTitle>
            </div>
            <DialogDescription>
              Các học viên đã chọn sẽ bị thu hồi quyền truy cập khóa học ngay lập tức.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBulkDeleteModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleBulkDelete}
            >
              Xác nhận xóa {selectedIds.length} học viên
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
