import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Home,
  ChevronRight,
  LayoutDashboard,
  BookOpen,
  Users,
  ShieldCheck,
  Lock,
  Globe,
  EyeOff,
  KeyRound,
  AlertTriangle,
  Check,
  Sliders,
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
  useToast,
} from '@/shared/ui';
import {
  useCourseQuery,
  useUpdateCourseMutation,
  useSetChapterAccessMutation,
} from '../api/courseApi';
import { useChaptersQuery, type ChapterSummary } from '@/features/content';

export function CourseAccessPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const { pushToast } = useToast();

  const { data: course, isLoading: isCourseLoading } = useCourseQuery(courseId);
  const { data: chapters = [], isLoading: isChaptersLoading } = useChaptersQuery(courseId);

  const { mutateAsync: updateCourse, isPending: isUpdatingCourse } = useUpdateCourseMutation(courseId);

  // Course Access State
  const [courseAccessMode, setCourseAccessMode] = useState<'PUBLIC' | 'PRIVATE' | 'ONLY_ME'>('PUBLIC');
  const [isConfirmModeModalOpen, setIsConfirmModeModalOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<'PUBLIC' | 'PRIVATE' | 'ONLY_ME' | null>(null);

  // Chapter Access Modal State
  const [selectedChapter, setSelectedChapter] = useState<ChapterSummary | null>(null);
  const [chapterAccessMode, setChapterAccessMode] = useState<'PUBLIC' | 'PROTECTED'>('PUBLIC');
  const [chapterPasscode, setChapterPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  const { mutateAsync: setChapterAccess, isPending: isSettingChapterAccess } =
    useSetChapterAccessMutation(courseId, selectedChapter?.id || '');

  useEffect(() => {
    if (course?.accessMode) {
      setCourseAccessMode(course.accessMode as 'PUBLIC' | 'PRIVATE' | 'ONLY_ME');
    }
  }, [course?.accessMode]);

  const handleSelectCourseMode = (mode: 'PUBLIC' | 'PRIVATE' | 'ONLY_ME') => {
    if (mode === courseAccessMode) return;
    if (mode === 'PRIVATE' || mode === 'ONLY_ME') {
      setPendingMode(mode);
      setIsConfirmModeModalOpen(true);
    } else {
      applyCourseAccessMode(mode);
    }
  };

  const applyCourseAccessMode = async (mode: 'PUBLIC' | 'PRIVATE' | 'ONLY_ME') => {
    try {
      await updateCourse({
        name: course?.name || '',
        accessMode: mode,
      });
      setCourseAccessMode(mode);
      setIsConfirmModeModalOpen(false);
      setPendingMode(null);
      pushToast({
        title: 'Cập nhật quyền truy cập khóa học thành công',
        description: `Khóa học hiện đang ở chế độ ${
          mode === 'PUBLIC' ? 'Công khai' : mode === 'PRIVATE' ? 'Riêng tư' : 'Chỉ mình tôi'
        }.`,
        tone: 'success',
      });
    } catch {
      pushToast({
        title: 'Cập nhật thất bại',
        description: 'Không thể lưu chế độ truy cập khóa học.',
        tone: 'error',
      });
    }
  };

  const handleOpenChapterModal = (ch: ChapterSummary) => {
    setSelectedChapter(ch);
    setChapterAccessMode((ch.accessMode as 'PUBLIC' | 'PROTECTED') || 'PUBLIC');
    setChapterPasscode('');
    setPasscodeError('');
  };

  const handleSaveChapterAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChapter) return;

    if (chapterAccessMode === 'PROTECTED') {
      if (!chapterPasscode.trim()) {
        setPasscodeError('Vui lòng nhập mật khẩu Passcode cho chương.');
        return;
      }
      if (chapterPasscode.trim().length < 4) {
        setPasscodeError('Passcode phải có tối thiểu 4 ký tự.');
        return;
      }
    }

    try {
      await setChapterAccess({
        accessMode: chapterAccessMode,
        passcode: chapterAccessMode === 'PROTECTED' ? chapterPasscode.trim() : undefined,
      });
      pushToast({
        title: 'Đã cập nhật quyền truy cập chương',
        description: `Chương "${selectedChapter.title}" đã được thiết lập thành công.`,
        tone: 'success',
      });
      setSelectedChapter(null);
    } catch {
      pushToast({
        title: 'Lỗi cập nhật',
        description: 'Không thể cập nhật cấu hình chương.',
        tone: 'error',
      });
    }
  };

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
        <span className="font-semibold text-foreground">Chế độ truy cập</span>
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

          <Link
            to={`/courses/${courseId}/manage/students`}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Users className="h-4 w-4" />
            <span>Danh sách học viên</span>
          </Link>

          {/* Active Tab: Chế độ truy cập */}
          <div className="bg-[#ff7a1a] text-[#5e2700] flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm shadow-xs select-none">
            <ShieldCheck className="h-4 w-4" />
            <span>Chế độ truy cập</span>
          </div>
        </div>
      </div>

      {/* 3. PAGE HEADER */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Cấu hình chế độ truy cập</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Thiết lập quy tắc phân quyền cho toàn bộ khóa học và bảo mật từng chương bài học (Ma trận Matrix 3.2.2).
        </p>
      </div>

      {/* 4. CARD 1: CẤU HÌNH KHÓA HỌC */}
      <div className="bg-card border border-border/70 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h2 className="text-base font-bold text-foreground">1. Chế độ truy cập Khóa học</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quyết định ai có thể tìm thấy và tham gia ghi danh vào khóa học này.
            </p>
          </div>
        </div>

        {isCourseLoading ? (
          <Skeleton className="h-28 w-full rounded-xl" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Option PUBLIC */}
            <div
              onClick={() => handleSelectCourseMode('PUBLIC')}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                courseAccessMode === 'PUBLIC'
                  ? 'border-primary bg-primary/5 shadow-xs'
                  : 'border-border/70 hover:border-border hover:bg-muted/30'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Globe className="h-5 w-5" />
                  </div>
                  {courseAccessMode === 'PUBLIC' && (
                    <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-sm">Công khai (PUBLIC)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Hiển thị trên trang Khám phá. Mọi người học có thể tự do ghi danh hoặc xem thử nội dung miễn phí.
                </p>
              </div>
            </div>

            {/* Option PRIVATE */}
            <div
              onClick={() => handleSelectCourseMode('PRIVATE')}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                courseAccessMode === 'PRIVATE'
                  ? 'border-primary bg-primary/5 shadow-xs'
                  : 'border-border/70 hover:border-border hover:bg-muted/30'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  {courseAccessMode === 'PRIVATE' && (
                    <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-sm">Riêng tư (PRIVATE)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Chỉ học viên được mời hoặc được bạn phê duyệt yêu cầu ghi danh mới có quyền vào học nội dung.
                </p>
              </div>
            </div>

            {/* Option ONLY_ME */}
            <div
              onClick={() => handleSelectCourseMode('ONLY_ME')}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                courseAccessMode === 'ONLY_ME'
                  ? 'border-primary bg-primary/5 shadow-xs'
                  : 'border-border/70 hover:border-border hover:bg-muted/30'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400">
                    <EyeOff className="h-5 w-5" />
                  </div>
                  {courseAccessMode === 'ONLY_ME' && (
                    <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-sm">Chỉ mình tôi (ONLY_ME)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ẩn hoàn toàn với học viên và hệ thống tìm kiếm. Dành riêng cho người tạo khóa biên tập và thử nghiệm.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. CARD 2: BẢNG CẤU HÌNH TRUY CẬP TỪNG CHƯƠNG */}
      <div className="bg-card border border-border/70 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h2 className="text-base font-bold text-foreground">2. Bảo vệ Passcode từng Chương</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cài đặt mật khẩu cho các chương bài giảng chuyên sâu hoặc kỳ kiểm tra đặc biệt.
            </p>
          </div>
        </div>

        {isChaptersLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : chapters.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Khóa học chưa có chương nào. Hãy tạo chương trong mục "Danh sách chương".
          </div>
        ) : (
          <div className="border border-border/70 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 font-semibold w-12 text-center">STT</th>
                  <th className="py-3 px-4 font-semibold">Tên chương</th>
                  <th className="py-3 px-4 font-semibold">Trạng thái</th>
                  <th className="py-3 px-4 font-semibold">Chế độ chương</th>
                  <th className="py-3 px-4 font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {chapters.map((ch, idx) => {
                  const isProtected = ch.accessMode === 'PROTECTED';
                  return (
                    <tr key={ch.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 text-center font-medium text-muted-foreground text-xs">
                        {ch.position ?? idx + 1}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground text-sm">
                        {ch.title}
                      </td>
                      <td className="py-3 px-4">
                        {ch.status === 'PUBLISHED' ? (
                          <span className="text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                            Đã xuất bản
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                            Bản nháp
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isProtected ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                            <Lock className="h-3 w-3" />
                            <span>Có mật khẩu (PROTECTED)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                            <Globe className="h-3 w-3" />
                            <span>Công khai (PUBLIC)</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenChapterModal(ch)}
                          className="h-8 px-3 text-xs rounded-lg flex items-center gap-1.5 ml-auto"
                        >
                          <Sliders className="h-3.5 w-3.5" />
                          <span>Cấu hình</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. MODAL CẢNH BÁO KHI CHUYỂN CHẾ ĐỘ KHÓA HỌC */}
      <Dialog open={isConfirmModeModalOpen} onOpenChange={setIsConfirmModeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-500 mb-1">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Xác nhận thay đổi chế độ khóa học</DialogTitle>
            </div>
            <DialogDescription>
              Khi chuyển sang chế độ{' '}
              <strong>{pendingMode === 'PRIVATE' ? 'Riêng tư (PRIVATE)' : 'Chỉ mình tôi (ONLY_ME)'}</strong>,
              người học vãng lai sẽ không còn được tự do truy cập. Học viên mới sẽ cần gửi yêu cầu ghi danh hoặc nhận thư mời từ bạn.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsConfirmModeModalOpen(false);
                setPendingMode(null);
              }}
              disabled={isUpdatingCourse}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={() => pendingMode && applyCourseAccessMode(pendingMode)}
              disabled={isUpdatingCourse}
              className="bg-primary text-primary-foreground"
            >
              {isUpdatingCourse ? 'Đang lưu...' : 'Đồng ý chuyển đổi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. MODAL CẤU HÌNH PASSCODE CHƯƠNG */}
      <Dialog open={Boolean(selectedChapter)} onOpenChange={(open) => !open && setSelectedChapter(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cấu hình truy cập chương</DialogTitle>
            <DialogDescription className="truncate">
              Chương: <strong>{selectedChapter?.title}</strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveChapterAccess} className="space-y-4 py-2">
            <div className="space-y-3">
              <label className="text-xs font-semibold text-foreground">Chế độ bảo vệ chương</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setChapterAccessMode('PUBLIC');
                    setPasscodeError('');
                  }}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    chapterAccessMode === 'PUBLIC'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Globe className="h-4 w-4 shrink-0" />
                  <span className="text-xs sm:text-sm">Công khai</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChapterAccessMode('PROTECTED')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    chapterAccessMode === 'PROTECTED'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Lock className="h-4 w-4 shrink-0" />
                  <span className="text-xs sm:text-sm">Có Passcode</span>
                </button>
              </div>
            </div>

            {chapterAccessMode === 'PROTECTED' && (
              <div className="space-y-2 pt-2 border-t border-border/60">
                <label htmlFor="chapter-passcode" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  <span>Mật khẩu Passcode chương</span>
                </label>
                <Input
                  id="chapter-passcode"
                  type="text"
                  placeholder="Nhập passcode (tối thiểu 4 ký tự)..."
                  value={chapterPasscode}
                  onChange={(e) => {
                    setChapterPasscode(e.target.value);
                    if (passcodeError) setPasscodeError('');
                  }}
                  autoFocus
                />
                {passcodeError && <p className="text-xs text-destructive">{passcodeError}</p>}
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Lưu ý: Mỗi lần cập nhật passcode mới, tất cả học viên đã mở khóa trước đó sẽ phải nhập lại mật khẩu mới.
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedChapter(null)}
                disabled={isSettingChapterAccess}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSettingChapterAccess} className="bg-primary text-primary-foreground">
                {isSettingChapterAccess ? 'Đang lưu...' : 'Lưu cấu hình'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
