import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { Button, Skeleton, ErrorState } from '@/shared/ui';
import { useCourseQuery } from '@/features/course';
import { useChaptersQuery } from '@/features/content';
import {
  useReadChapterQuery,
  useCourseProgressQuery,
  useMyBookmarksQuery,
} from '../api/learningApi';
import { LearningSyllabusSidebar } from '../components/LearningSyllabusSidebar';
import { BlockRenderer } from '../components/BlockRenderer';
import { ChapterPasscodeModal } from '../components/ChapterPasscodeModal';
import { GuestBanner } from '../components/GuestBanner';
import { BookmarkButton } from '../components/BookmarkButton';
import { CommentSection } from '../components/CommentSection';
import { useAuth } from '@/shared/hooks';

export function LearningPlayerPage() {
  const { courseId = '', chapterId: urlChapterId } = useParams<{
    courseId: string;
    chapterId?: string;
  }>();
  const navigate = useNavigate();

  const { data: course, isLoading: isCourseLoading } = useCourseQuery(courseId);
  const { user } = useAuth();
  const { data: allChapters = [], isLoading: isChaptersLoading } = useChaptersQuery(courseId);

  // Filter only published chapters for learning player (or all if owner/draft preview)
  const chapters = allChapters.length > 0 ? allChapters : [];

  // Determine active chapter ID
  const activeChapterId = urlChapterId || chapters[0]?.id || '';

  // Track unlocked chapters in session
  const [unlockedChapterIds, setUnlockedChapterIds] = useState<Set<string>>(new Set());
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);

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

  // If chapter needs passcode, trigger passcode modal
  useEffect(() => {
    if (contentError) {
      const err = contentError as any;
      if (err?.status === 403 && (err?.code === 'PASSCODE_REQUIRED' || err?.detail?.includes('mật khẩu') || err?.title?.includes('Passcode'))) {
        setIsPasscodeModalOpen(true);
      }
    }
  }, [contentError]);

  // If urlChapterId is empty and chapters are loaded, navigate to the first chapter
  useEffect(() => {
    if (!urlChapterId && chapters.length > 0 && chapters[0]?.id) {
      navigate(`/courses/${courseId}/learn/${chapters[0].id}`, { replace: true });
    }
  }, [urlChapterId, chapters, courseId, navigate]);

  const activeIndex = chapters.findIndex((c) => c.id === activeChapterId);
  const prevChapter = activeIndex > 0 ? chapters[activeIndex - 1] : null;
  const nextChapter = activeIndex !== -1 && activeIndex < chapters.length - 1 ? chapters[activeIndex + 1] : null;

  const currentChapterSummary = chapters.find((c) => c.id === activeChapterId);
  const canSaveProgress = chapterContent?.canSaveProgress ?? false;

  const handlePasscodeUnlocked = () => {
    setUnlockedChapterIds((prev) => new Set(prev).add(activeChapterId));
    setIsPasscodeModalOpen(false);
    refetchChapter();
    refetchProgress();
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

  const courseTitle = course?.name || 'Khóa học';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* 1. GUEST BANNER (If canSaveProgress = false) */}
      {!canSaveProgress && !isContentLoading && <GuestBanner courseId={courseId} />}

      {/* 2. TOP LEARNING BAR */}
      <header className="h-14 border-b border-border bg-card px-4 sm:px-6 flex items-center justify-between shrink-0 select-none z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/courses/${courseId}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted"
            title="Quay lại thông tin khóa học"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Chi tiết khóa</span>
          </Link>

          <span className="text-border">|</span>

          <h1 className="text-xs sm:text-sm font-bold text-foreground truncate max-w-xs sm:max-w-md md:max-w-xl">
            {courseTitle}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {activeChapterId && (
            <BookmarkButton
              courseId={courseId}
              chapterId={activeChapterId}
              isBookmarked={isBookmarked}
            />
          )}

          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground border-l border-border pl-3">
            <span>Tiến độ:</span>
            <span className="font-bold text-primary">{progress?.percent ?? 0}%</span>
          </div>
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10 max-w-4xl mx-auto w-full space-y-8">
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
            <div className="space-y-8">
              {/* Chapter Header */}
              <div className="space-y-2 border-b border-border/70 pb-5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Chương {currentChapterSummary?.position ?? (activeIndex !== -1 ? activeIndex + 1 : 1)}
                  </span>
                  <span className="text-border">•</span>
                  <span className="text-xs text-muted-foreground">
                    Phiên bản v{chapterContent.versionNo}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  {chapterContent.title}
                </h1>

                {chapterContent.description && (
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed pt-1">
                    {chapterContent.description}
                  </p>
                )}
              </div>

              {/* Block List Content */}
              {chapterContent.blocks.length === 0 ? (
                <div className="bg-card border border-border/70 rounded-2xl p-8 text-center text-muted-foreground text-sm">
                  Chương học hiện chưa có khối nội dung nào.
                </div>
              ) : (
                <div className="space-y-6">
                  {chapterContent.blocks.map((block) => (
                    <BlockRenderer
                      key={block.id}
                      courseId={courseId}
                      block={block}
                      canSaveProgress={canSaveProgress}
                    />
                  ))}
                </div>
              )}

              {/* Next / Previous Chapter Navigation */}
              <div className="border-t border-border/70 pt-6 flex items-center justify-between gap-4">
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
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:bg-primary/90 transition-colors shadow-xs ml-auto max-w-[45%]"
                  >
                    <span className="truncate">Chương tiếp: {nextChapter.title}</span>
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  </Link>
                ) : (
                  <div />
                )}
              </div>

              {/* Comment Section (SCR-LRN-06) */}
              <div className="pt-6">
                <CommentSection
                  courseId={courseId}
                  chapterId={activeChapterId}
                  isOwner={Boolean(course?.viewer?.isOwner || (user && course?.owner?.id === user.id))}
                />
              </div>
            </div>
          )}
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
    </div>
  );
}
