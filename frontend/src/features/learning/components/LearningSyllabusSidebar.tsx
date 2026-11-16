import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Lock,
  ChevronLeft,
  ChevronRight,
  Award,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { ChapterSummary } from '@/features/content';
import type { ProgressDto } from '../api/learningApi';

interface LearningSyllabusSidebarProps {
  courseId: string;
  courseName: string;
  chapters: ChapterSummary[];
  activeChapterId?: string;
  progress?: ProgressDto | null;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  unlockedChapterIds?: Set<string>;
}

export function LearningSyllabusSidebar({
  courseId,
  courseName,
  chapters,
  activeChapterId,
  progress,
  unlockedChapterIds = new Set(),
}: LearningSyllabusSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const percent = progress?.percent ?? 0;
  const completedChapterIds = progress?.completedChapterIds ?? [];

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-border bg-card transition-all duration-300 shrink-0 select-none h-full',
        isCollapsed ? 'w-16' : 'w-72 sm:w-80'
      )}
    >
      {/* Top Header */}
      <div className="p-4 border-b border-border/70 flex items-center justify-between">
        {!isCollapsed && (
          <div className="space-y-1 overflow-hidden pr-2">
            <h2 className="font-bold text-sm text-foreground truncate" title={courseName}>
              {courseName}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Mục lục bài học</span>
              <span>•</span>
              <span className="font-semibold text-primary">{chapters.length} chương</span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mx-auto"
          title={isCollapsed ? 'Mở rộng mục lục' : 'Thu gọn mục lục'}
          aria-label={isCollapsed ? 'Mở rộng mục lục' : 'Thu gọn mục lục'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Course Overall Progress Bar */}
      {!isCollapsed && (
        <div className="p-4 border-b border-border/70 bg-muted/20 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-primary" />
              Tiến độ hoàn thành
            </span>
            <span className="font-bold text-primary">{percent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: `${percent}%` }}
            />
          </div>
          {percent >= 100 && (
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Bạn đã hoàn thành 100% khóa học!
            </p>
          )}
        </div>
      )}

      {/* Chapters Syllabus List */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1" aria-label="Danh sách chương">
        {chapters.map((ch, idx) => {
          const chId = ch.id || '';
          const isActive = chId === activeChapterId;
          const isCompleted = completedChapterIds.includes(chId);
          const isProtected = ch.accessMode === 'PROTECTED';
          const isUnlocked = unlockedChapterIds.has(chId);

          const chapterProgress = progress?.chapters?.find((c) => c.chapterId === chId);
          const chapterPercent = chapterProgress?.percent ?? (isCompleted ? 100 : 0);

          if (isCollapsed) {
            return (
              <Link
                key={chId || idx}
                to={`/courses/${courseId}/learn/${chId}`}
                title={ch.title}
                className={cn(
                  'flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : isProtected && !isUnlocked ? (
                  <Lock className="h-4 w-4 text-amber-500" />
                ) : (
                  <span className="text-xs font-semibold">{ch.position ?? idx + 1}</span>
                )}
              </Link>
            );
          }

          return (
            <Link
              key={chId || idx}
              to={`/courses/${courseId}/learn/${chId}`}
              className={cn(
                'group flex items-start gap-3 p-3 rounded-xl transition-all text-left relative',
                isActive
                  ? 'bg-primary/10 border border-primary/30 text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              {/* Status Icon */}
              <div className="pt-0.5 shrink-0">
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : isProtected && !isUnlocked ? (
                  <Lock className="h-4 w-4 text-amber-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                )}
              </div>

              {/* Title & Progress info */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Chương {ch.position ?? idx + 1}
                  </span>
                  {isProtected && (
                    <span className="text-[10px] font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 rounded">
                      Passcode
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    'text-xs sm:text-sm line-clamp-2 leading-snug',
                    isActive ? 'font-semibold text-foreground' : 'text-foreground/90'
                  )}
                >
                  {ch.title}
                </p>
                {chapterPercent > 0 && chapterPercent < 100 && (
                  <div className="pt-1 flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${chapterPercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {chapterPercent}%
                    </span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
