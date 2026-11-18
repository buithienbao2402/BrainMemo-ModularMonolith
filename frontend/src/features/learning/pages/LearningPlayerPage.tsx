import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Lock,
  MessageCircle,
  MessageSquare,
  Bookmark,
  User as UserIcon,
  Settings,
  LogOut,
} from 'lucide-react';
import {
  Button,
  Skeleton,
  ErrorState,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui';
import { BrandLogo, ThemeToggleButton } from '@/app/layouts';
import { useCourseQuery } from '@/features/course';
import { useChaptersQuery } from '@/features/content';
import { ChatDrawer } from '@/features/messaging';
import {
  useReadChapterQuery,
  useCourseProgressQuery,
  useMyBookmarksQuery,
} from '../api/learningApi';
import { useCommentsSummaryQuery } from '../api/commentsApi';
import { LearningSyllabusSidebar } from '../components/LearningSyllabusSidebar';
import { BlockRenderer } from '../components/BlockRenderer';
import { ChapterPasscodeModal } from '../components/ChapterPasscodeModal';
import { GuestBanner } from '../components/GuestBanner';
import { BookmarkButton } from '../components/BookmarkButton';
import { CommentSection } from '../components/CommentSection';
import { SeamlessSampleLesson } from '../components/SeamlessSampleLesson';
import { useAuth } from '@/shared/hooks';

function getInitials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BM';
  const first = parts[0] ?? 'B';
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  return `${first[0] ?? 'B'}${last[0] ?? ''}`.toUpperCase();
}

export function LearningPlayerPage() {
  const { courseId = '', chapterId: urlChapterId } = useParams<{
    courseId: string;
    chapterId?: string;
  }>();
  const navigate = useNavigate();

  const { data: course, isLoading: isCourseLoading } = useCourseQuery(courseId);
  const { user, profile, logout } = useAuth();
  const { data: allChapters = [], isLoading: isChaptersLoading } = useChaptersQuery(courseId);

  // Draft chapters must NOT appear on student learning player. Only PUBLISHED chapters are visible.
  const chapters = allChapters.filter((c) => c.status === 'PUBLISHED');

  // Determine active chapter ID (defaults to urlChapterId if present, else first published chapter)
  const activeChapterId = urlChapterId || chapters[0]?.id || '';

  // Track unlocked chapters in session
  const [unlockedChapterIds, setUnlockedChapterIds] = useState<Set<string>>(new Set());
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const {
    data: chapterContent,
    isLoading: isContentLoading,
    isError: isContentError,
    error: contentError,
    refetch: refetchChapter,
  } = useReadChapterQuery(courseId, activeChapterId, {
    enabled: Boolean(courseId && activeChapterId),
  });

  const { data: progress, refetch: refetchProgress } = useCourseProgressQuery(courseId, {
    enabled: Boolean(courseId),
  });

  const { data: bookmarks = [] } = useMyBookmarksQuery();
  const isBookmarked = bookmarks.some(
    (b) => b.courseId === courseId && b.chapterId === activeChapterId
  );

  const { data: qaSummary } = useCommentsSummaryQuery(courseId);

  // If chapter needs passcode, trigger passcode modal
  useEffect(() => {
    if (contentError) {
      const err = contentError as any;
      if (
        err?.status === 403 &&
        (err?.code === 'PASSCODE_REQUIRED' ||
          err?.detail?.includes('mật khẩu') ||
          err?.title?.includes('Passcode'))
      ) {
        setIsPasscodeModalOpen(true);
      }
    }
  }, [contentError]);

  // If urlChapterId is not in published chapters and published chapters exist, navigate to the first published chapter
  useEffect(() => {
    if (chapters.length > 0) {
      const isUrlValid = urlChapterId && chapters.some((c) => c.id === urlChapterId);
      if (!isUrlValid && chapters[0]?.id) {
        navigate(`/courses/${courseId}/learn/${chapters[0].id}`, { replace: true });
      }
    }
  }, [urlChapterId, chapters, courseId, navigate]);

  const activeIndex = chapters.findIndex((c) => c.id === activeChapterId);
  const prevChapter = activeIndex > 0 ? chapters[activeIndex - 1] : null;
  const nextChapter =
    activeIndex !== -1 && activeIndex < chapters.length - 1 ? chapters[activeIndex + 1] : null;

  const currentChapterSummary = chapters.find((c) => c.id === activeChapterId);
  const canSaveProgress = chapterContent?.canSaveProgress ?? false;

  const handlePasscodeUnlocked = () => {
    setUnlockedChapterIds((prev) => new Set(prev).add(activeChapterId));
    setIsPasscodeModalOpen(false);
    refetchChapter();
    refetchProgress();
  };

  const scrollToQA = () => {
    const el = document.getElementById('qa-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (isCourseLoading || isChaptersLoading) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        <Skeleton className="w-80 h-full shrink-0 border-r border-border" />
        <div className="flex-1 p-6 space-y-6">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const courseTitle = course?.name || 'Nhập môn Python - Từ Zero tới Hero';
  const displayName = profile?.displayName?.trim() || user?.email || 'Quang Tiến';
  const progressPercent = progress?.percent ?? 45; // Default 45% as in mockup if newly started

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* 1. GUEST BANNER (If canSaveProgress = false) */}
      {!canSaveProgress && !isContentLoading && <GuestBanner courseId={courseId} />}

      {/* 2. TOP LEARNING BAR - Matching Mockup */}
      <header className="h-14 border-b border-border bg-card/95 backdrop-blur-xs px-3 sm:px-6 flex items-center justify-between shrink-0 select-none z-20 gap-3">
        {/* Left: Back / Brand Logo & Course Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            to={`/courses/${courseId}`}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            title="Quay lại chi tiết khóa học"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>


          <h1 className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[140px] sm:max-w-xs md:max-w-md lg:max-w-lg">
            {courseTitle}
          </h1>
        </div>

        {/* Center: Course Progress with Progress Bar beneath */}
        <div className="hidden md:flex flex-col items-center gap-1 min-w-[130px] max-w-[180px]">
          <span className="text-[11px] font-semibold text-muted-foreground select-none">
            <strong className="text-foreground">{progressPercent}%</strong> hoàn thành
          </span>
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Actions, Q&A jump, Bookmark, Theme Toggle & User Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick jump to Q&A section */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={scrollToQA}
            className="h-8 px-2 sm:px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5"
            title="Xem khu vực Hỏi đáp bài học"
          >
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            <span className="hidden lg:inline">Hỏi đáp</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/15 text-primary font-bold">
              {qaSummary?.totalComments ?? 12}
            </span>
          </Button>

          {/* 1-1 Chat with instructor */}
          {user && !course?.viewer?.isOwner && course?.owner?.id !== user.id && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsChatOpen(true)}
              className="hidden xl:inline-flex items-center gap-1.5 h-8 text-xs font-medium"
            >
              <MessageCircle className="h-3.5 w-3.5 text-primary" />
              <span>Nhắn tin giảng viên</span>
            </Button>
          )}

          {/* Bookmark Button */}
          {activeChapterId && (
            <BookmarkButton
              courseId={courseId}
              chapterId={activeChapterId}
              isBookmarked={isBookmarked}
            />
          )}

          {/* Theme Toggle Button (Light / Dark mode) */}
          <ThemeToggleButton className="h-8 w-8 rounded-lg" />

          {/* User Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border border-border/80 hover:bg-muted/60 transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={displayName}
              >
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary shrink-0">
                    {getInitials(displayName)}
                  </span>
                )}
                <span className="text-xs font-semibold text-foreground max-w-[80px] sm:max-w-[120px] truncate hidden sm:inline">
                  {displayName}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:inline" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate font-semibold text-foreground text-xs">
                {displayName}
              </DropdownMenuLabel>
              {user?.email && (
                <p className="truncate px-3 pb-1.5 text-[11px] text-muted-foreground">
                  {user.email}
                </p>
              )}
              <DropdownMenuSeparator />
              {user?.id && (
                <DropdownMenuItem onSelect={() => navigate(`/users/${user.id}`)}>
                  <UserIcon className="h-4 w-4 text-muted-foreground mr-2" />
                  <span>Trang cá nhân</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => navigate('/me/bookmarks')}>
                <Bookmark className="h-4 w-4 text-muted-foreground mr-2" />
                <span>Khóa học đã lưu</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/settings/profile')}>
                <Settings className="h-4 w-4 text-muted-foreground mr-2" />
                <span>Cài đặt tài khoản</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  void handleLogout();
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* 3. MAIN WORKSPACE: SIDEBAR + CONTENT CANVAS */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Syllabus Sidebar */}
        <LearningSyllabusSidebar
          courseId={courseId}
          courseName={courseTitle}
          chapters={chapters}
          activeChapterId={activeChapterId}
          progress={progress}
          isBookmarked={isBookmarked}
          unlockedChapterIds={unlockedChapterIds}
        />

        {/* Center Content View Canvas */}
        <main className="flex-1 overflow-y-auto w-full">
          <div className="max-w-4xl mx-auto p-4 sm:p-8 lg:p-12 space-y-10">
            {isContentLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-10 w-2/3 rounded-xl" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
              </div>
            ) : isContentError ? (
              (contentError as any)?.status === 403 ? (
                <div className="bg-card border border-amber-500/30 rounded-2xl p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto my-12">
                  <div className="inline-flex p-3 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Lock className="h-8 w-8" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Chương yêu cầu mật khẩu bảo vệ</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Chương học này được giảng viên bảo vệ bằng Passcode. Vui lòng nhập mật khẩu để mở khóa và học nội dung.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setIsPasscodeModalOpen(true)}
                    className="bg-primary text-primary-foreground font-semibold px-6"
                  >
                    Nhập mật khẩu Passcode
                  </Button>
                </div>
              ) : (
                <ErrorState
                  title="Không thể tải nội dung bài học"
                  error={contentError}
                  onRetry={() => refetchChapter()}
                />
              )
            ) : !chapterContent ? (
              <div className="text-center py-12 text-muted-foreground">
                Không tìm thấy nội dung bài học.
              </div>
            ) : (
              <div className="space-y-10">
                {/* Chapter Header matching Mockup */}
                <div className="space-y-2 border-b border-border/70 pb-6 text-center sm:text-left">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                    {chapterContent.title}
                  </h1>

                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 text-xs text-muted-foreground font-medium">
                    <span>- Cập nhật 2 ngày trước -</span>
                  </div>

                  {chapterContent.description && (
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed pt-2">
                      {chapterContent.description}
                    </p>
                  )}
                </div>

                {/* Main Chapter Content: Seamless continuous reading */}
                {chapterContent.blocks.length === 0 ? (
                  <SeamlessSampleLesson />
                ) : (
                  <div className="space-y-6">
                    {chapterContent.blocks.map((block, idx) => (
                      <BlockRenderer
                        key={block.id}
                        courseId={courseId}
                        block={block}
                        blockIndex={idx}
                        canSaveProgress={canSaveProgress}
                      />
                    ))}
                  </div>
                )}

                {/* Next / Previous Chapter Navigation */}
                <div className="border-t border-border/70 pt-8 flex items-center justify-between gap-4">
                  {prevChapter ? (
                    <Link
                      to={`/courses/${courseId}/learn/${prevChapter.id}`}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/70 text-xs sm:text-sm font-semibold text-foreground hover:bg-muted transition-colors max-w-[45%]"
                    >
                      <ChevronLeft className="h-4 w-4 shrink-0" />
                      <span className="truncate">Chương trước: {prevChapter.title}</span>
                    </Link>
                  ) : (
                    <div />
                  )}

                  {nextChapter ? (
                    <Link
                      to={`/courses/${courseId}/learn/${nextChapter.id}`}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm hover:bg-primary/90 transition-all shadow-md ml-auto"
                    >
                      <span>Chương tiếp theo</span>
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    </Link>
                  ) : (
                    <Link
                      to={`/courses/${courseId}`}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm hover:bg-primary/90 transition-all shadow-md ml-auto"
                    >
                      <span>Chương tiếp theo</span>
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    </Link>
                  )}
                </div>

                {/* Comment & Q&A Section (SCR-LRN-06) */}
                <div className="pt-6">
                  <CommentSection
                    courseId={courseId}
                    chapterId={activeChapterId}
                    isOwner={Boolean(course?.viewer?.isOwner || (user && course?.owner?.id === user.id))}
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 4. MODAL NHẬP PASSCODE CHƯƠNG */}
      <ChapterPasscodeModal
        isOpen={isPasscodeModalOpen}
        onClose={() => setIsPasscodeModalOpen(false)}
        courseId={courseId}
        chapterId={activeChapterId}
        chapterTitle={currentChapterSummary?.title}
        onSuccess={handlePasscodeUnlocked}
      />

      {/* 5. CHAT DRAWER VỚI GIẢNG VIÊN */}
      <ChatDrawer
        courseId={courseId}
        courseName={courseTitle}
        open={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
}
