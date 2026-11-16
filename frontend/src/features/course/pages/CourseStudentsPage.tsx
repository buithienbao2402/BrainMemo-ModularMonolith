import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Home,
  ChevronRight,
  LayoutDashboard,
  BookOpen,
  Users,
  ShieldCheck,
  Search,
  UserPlus,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Mail,
  UserCheck,
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

type StudentTab = 'ACTIVE' | 'COMPLETED' | 'PENDING_APPROVAL' | 'INVITED';

export function CourseStudentsPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const { pushToast } = useToast();

  const [activeTab, setActiveTab] = useState<StudentTab>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedStudentToRemove, setSelectedStudentToRemove] = useState<EnrollmentDto | null>(null);

  const { data: course } = useCourseQuery(courseId);

  // Status parameter for API
  const apiStatus =
    activeTab === 'ACTIVE'
      ? 'ACTIVE'
      : activeTab === 'COMPLETED'
      ? 'ACTIVE'
      : activeTab === 'PENDING_APPROVAL'
      ? 'PENDING_APPROVAL'
      : 'INVITED';

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
      refetch();
    } catch {
      pushToast({
        title: 'Không thể xóa học viên',
        description: 'Đã xảy ra lỗi khi xóa học viên.',
        tone: 'error',
      });
    }
  };

  const items = enrollmentsData?.items || [];
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = item.user?.displayName?.toLowerCase().includes(q);
    const userEmail = (item.user as any)?.email;
    const emailMatch = userEmail ? userEmail.toLowerCase().includes(q) : false;
    return nameMatch || emailMatch;
  });

  const courseTitle = course?.name || 'Khóa học';

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 text-foreground">
      {/* 1. TOP BREADCRUMB */}
      <nav aria-label="Đường dẫn điều hướng" className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/manage/courses" className="hover:text-foreground transition-colors flex items-center gap-1.5">
          <Home className="h-3.5 w-3.5" />
          <span>Trang chủ</span>
        </Link>
        <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
        <Link to={`/courses/${courseId}/manage`} className="hover:text-foreground transition-colors truncate max-w-[200px] sm:max-w-xs">
          Khóa học {courseTitle}
        </Link>
        <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">Danh sách học viên</span>
      </nav>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="border-b border-border/70 pb-3 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <Link
            to={`/courses/${courseId}/manage`}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Tổng quan</span>
          </Link>

          <Link
            to={`/courses/${courseId}/manage/content`}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            <span>Danh sách chương</span>
          </Link>

          {/* Active Tab: Danh sách học viên */}
          <div className="bg-[#ff7a1a] text-[#5e2700] flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm shadow-xs select-none">
            <Users className="h-4 w-4" />
            <span>Danh sách học viên</span>
          </div>

          <Link
            to={`/courses/${courseId}/manage/access`}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Chế độ truy cập</span>
          </Link>
        </div>
      </div>

      {/* 3. PAGE HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Quản lý học viên</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi trạng thái tham gia, duyệt yêu cầu ghi danh và mời người học mới.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setIsInviteModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 shadow-xs"
        >
          <UserPlus className="h-4 w-4" />
          <span>Mời học viên</span>
        </Button>
      </div>

      {/* 4. 4 FILTER TABS & SEARCH */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card border border-border/70 p-3 sm:p-4 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'ACTIVE'
                ? 'bg-primary/15 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            Đang học
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'COMPLETED'
                ? 'bg-primary/15 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            Đã hoàn thành
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PENDING_APPROVAL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'PENDING_APPROVAL'
                ? 'bg-primary/15 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            Chờ duyệt
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('INVITED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'INVITED'
                ? 'bg-primary/15 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            Đã mời
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Tìm theo tên, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm rounded-xl"
          />
        </div>
      </div>

      {/* 5. STUDENTS LIST TABLE */}
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
            <Users className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-base">Không tìm thấy học viên nào</h3>
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
        <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 font-semibold">Học viên</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Trạng thái</th>
                  <th className="py-3 px-4 font-semibold">Thời gian</th>
                  <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredItems.map((item) => {
                  const studentName = item.user?.displayName || 'Học viên';
                  const studentEmail = (item.user as any)?.email || 'Chưa có email';
                  const initials = studentName
                    .trim()
                    .split(/\s+/)
                    .map((w: string) => w[0])
                    .slice(-2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {item.user?.avatarUrl ? (
                            <img
                              src={item.user.avatarUrl}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                              {initials || 'HV'}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-foreground text-sm leading-tight">
                              {studentName}
                            </p>
                            <span className="text-[11px] text-muted-foreground sm:hidden">
                              {studentEmail}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{studentEmail}</td>
                      <td className="py-3 px-4">
                        {item.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full">
                            <CheckCircle className="h-3 w-3" />
                            <span>Đang học</span>
                          </span>
                        )}
                        {item.status === 'PENDING_APPROVAL' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full">
                            <Clock className="h-3 w-3" />
                            <span>Chờ duyệt</span>
                          </span>
                        )}
                        {item.status === 'INVITED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-full">
                            <Mail className="h-3 w-3" />
                            <span>Đã mời</span>
                          </span>
                        )}
                        {item.status === 'REMOVED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-destructive/10 text-destructive px-2.5 py-0.5 rounded-full">
                            <XCircle className="h-3 w-3" />
                            <span>Đã xóa</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {item.statusChangedAt
                          ? new Date(item.statusChangedAt).toLocaleDateString('vi-VN')
                          : '–'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.status === 'PENDING_APPROVAL' ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleDecide(item.requestId || item.id || '', 'ACCEPTED')}
                              disabled={isDeciding}
                              className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                            >
                              <UserCheck className="h-3.5 w-3.5 mr-1" />
                              Duyệt
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDecide(item.requestId || item.id || '', 'REJECTED')}
                              disabled={isDeciding}
                              className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 rounded-lg"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Từ chối
                            </Button>
                          </div>
                        ) : item.status === 'ACTIVE' ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedStudentToRemove(item)}
                            className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 rounded-lg"
                            title="Xóa học viên khỏi khóa"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            <span>Xóa</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. MODAL MỜI HỌC VIÊN */}
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
              <Button type="submit" disabled={isInviting || !inviteEmail.trim()} className="bg-primary text-primary-foreground">
                {isInviting ? 'Đang gửi lời mời...' : 'Gửi lời mời'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 7. MODAL XÁC NHẬN XÓA HỌC VIÊN */}
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
              Học viên <strong>"{selectedStudentToRemove?.user?.displayName}"</strong> sẽ mất quyền truy cập vào nội dung học tập và không thể tự đăng ký lại nếu chưa có lời mời từ bạn.
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
    </div>
  );
}
