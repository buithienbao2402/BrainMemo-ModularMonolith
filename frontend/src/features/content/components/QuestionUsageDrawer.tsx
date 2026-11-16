import { useEffect } from 'react';
import { X, HelpCircle, BarChart3, ListChecks } from 'lucide-react';
import { useQuestionUsageQuery } from '../api/contentApi';
import { Button } from '@/shared/ui';

interface QuestionUsageDrawerProps {
  courseId: string;
  questionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuestionUsageDrawer({
  courseId,
  questionId,
  isOpen,
  onClose,
}: QuestionUsageDrawerProps) {
  const { data: usage, isLoading } = useQuestionUsageQuery(courseId, questionId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
      <div
        className="h-full w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col p-6 animate-in slide-in-from-right duration-200"
        role="region"
        aria-labelledby="usage-drawer-title"
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h3 id="usage-drawer-title" className="text-base font-semibold text-foreground">
              Thông tin sử dụng câu hỏi
            </h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Đóng bảng">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-20 bg-muted/40 animate-pulse rounded-lg" />
              <div className="h-20 bg-muted/40 animate-pulse rounded-lg" />
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/30 p-3 rounded-lg border border-border text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {usage?.quizCount ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Bài thi dùng</div>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg border border-border text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {usage?.attemptCount ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Lượt trả lời</div>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg border border-border text-center">
                  <div className="text-2xl font-bold text-primary">
                    {usage?.correctRate != null ? `${Math.round(usage.correctRate)}%` : '—'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Tỉ lệ đúng</div>
                </div>
              </div>

              {/* Quiz list using this question */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ListChecks className="h-3.5 w-3.5" />
                  Danh sách bài thi liên kết
                </h4>
                {usage?.usedInQuizzes && usage.usedInQuizzes.length > 0 ? (
                  <div className="space-y-2">
                    {usage.usedInQuizzes.map((q) => (
                      <div
                        key={q.quizBlockId}
                        className="p-3 rounded-lg border border-border bg-background flex flex-col gap-1 text-sm"
                      >
                        <span className="font-medium text-foreground">{q.title}</span>
                        {q.chapterTitle && (
                          <span className="text-xs text-muted-foreground">
                            Chương: {q.chapterTitle}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                    Câu hỏi này hiện chưa được sử dụng trong bài thi nào.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
