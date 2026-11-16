import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Award,
  XCircle,
  Clock,
  BookOpen,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Check,
  X,
  FileQuestion,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import { useQuizAttemptQuery } from '../api/quizApi';

export function QuizResultPage() {
  const { courseId, attemptId } = useParams<{ courseId?: string; attemptId: string }>();
  const navigate = useNavigate();

  const { data: attempt, isLoading, isError, error } = useQuizAttemptQuery(attemptId!);

  // Duration calculation
  const durationText = useMemo(() => {
    if (!attempt?.startedAt || !attempt?.submittedAt) return '--';
    const start = new Date(attempt.startedAt).getTime();
    const end = new Date(attempt.submittedAt).getTime();
    const totalSec = Math.max(0, Math.floor((end - start) / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins} phút ${secs} giây`;
  }, [attempt?.startedAt, attempt?.submittedAt]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Đang tải kết quả bài kiểm tra...</p>
        </div>
      </div>
    );
  }

  if (isError || !attempt) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Không tìm thấy kết quả</h2>
          <p className="text-xs text-muted-foreground">
            {error instanceof Error ? error.message : 'Không thể tải thông tin kết quả của lần thi này.'}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full text-xs font-semibold"
          >
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  const questions = attempt.questions ?? [];
  const totalScore = attempt.totalScore ?? 0;
  const maxScore = attempt.maxScore > 0 ? attempt.maxScore : 10;
  const percent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const isPassed = percent >= 70; // Pass threshold default

  const hasPendingEssay = questions.some(
    (q) =>
      (q.questionType === 'SHORT_ESSAY' || q.questionType === 'ESSAY') &&
      q.studentAnswer?.pointsEarned == null
  );

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (courseId) {
                navigate(`/courses/${courseId}/learn`);
              } else {
                navigate(-1);
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại bài học</span>
          </button>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Lần thi {attempt.attemptNo}
          </span>
        </div>

        {/* Hero Result Banner */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm text-center space-y-5">
          <div
            className={`h-20 w-20 rounded-full flex items-center justify-center mx-auto transition-transform ${
              isPassed
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}
          >
            {isPassed ? <Award className="h-10 w-10" /> : <XCircle className="h-10 w-10" />}
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {isPassed ? 'Chúc mừng! Bạn đã ĐẠT' : 'Bạn chưa đạt yêu cầu'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              {isPassed
                ? 'Bạn đã hoàn thành xuất sắc bài kiểm tra và đạt yêu cầu kiến thức của chương học.'
                : 'Hãy xem lại đáp án và lời giải chi tiết bên dưới để ôn tập kiến thức trước khi làm lại nhé.'}
            </p>
          </div>

          {/* Score Badge */}
          <div className="inline-flex items-baseline gap-2 bg-muted/60 border border-border px-6 py-3 rounded-2xl">
            <span className="text-3xl sm:text-4xl font-extrabold text-primary">
              {totalScore.toFixed(1)}
            </span>
            <span className="text-sm font-semibold text-muted-foreground">
              / {maxScore.toFixed(1)} điểm ({percent}%)
            </span>
          </div>

          {hasPendingEssay && (
            <div className="flex items-center justify-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 py-2 px-4 rounded-xl max-w-lg mx-auto border border-amber-500/20">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Bài thi có câu tự luận đang chờ giảng viên chấm điểm bổ sung.</span>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto pt-2 text-left">
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-0.5">
              <span className="text-[11px] text-muted-foreground">Thời gian làm bài</span>
              <p className="text-xs font-bold text-foreground">{durationText}</p>
            </div>
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-0.5">
              <span className="text-[11px] text-muted-foreground">Số câu hỏi</span>
              <p className="text-xs font-bold text-foreground">{questions.length} câu</p>
            </div>
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-0.5 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-muted-foreground">Trạng thái</span>
              <p className="text-xs font-bold text-foreground">{attempt.status}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            {courseId && (
              <Button
                type="button"
                variant="primary"
                onClick={() => navigate(`/courses/${courseId}/learn`)}
                className="h-9 px-5 text-xs font-semibold gap-1.5"
              >
                <BookOpen className="h-4 w-4" />
                <span>Tiếp tục học bài</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const el = document.getElementById('review-questions-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="h-9 px-4 text-xs font-semibold gap-1.5"
            >
              <FileQuestion className="h-4 w-4" />
              <span>Xem chi tiết bài làm</span>
            </Button>
          </div>
        </div>

        {/* Detailed Question Review Section */}
        <section id="review-questions-section" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">
              Chi tiết câu hỏi & Lời giải ({questions.length})
            </h2>
            <span className="text-xs text-muted-foreground">
              Điểm đạt: {totalScore.toFixed(1)} / {maxScore.toFixed(1)}
            </span>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const studentAnswer = q.studentAnswer;
              const pointsEarned = studentAnswer?.pointsEarned ?? 0;
              const isFullyCorrect = pointsEarned >= q.maxPoints && q.maxPoints > 0;
              const isPartiallyCorrect = pointsEarned > 0 && pointsEarned < q.maxPoints;

              return (
                <div
                  key={q.id}
                  className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4"
                >
                  {/* Question Index & Points Badge */}
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center rounded-lg bg-muted font-bold text-xs h-6 px-2.5 text-foreground">
                        Câu {idx + 1}
                      </span>
                      <span className="text-[11px] font-bold text-muted-foreground uppercase">
                        {q.questionType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isFullyCorrect ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3.5 w-3.5" /> +{pointsEarned.toFixed(1)} / {q.maxPoints} đ
                        </span>
                      ) : isPartiallyCorrect ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                          ~{pointsEarned.toFixed(1)} / {q.maxPoints} đ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                          <X className="h-3.5 w-3.5" /> 0 / {q.maxPoints} đ
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stem */}
                  <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
                    {q.stem}
                  </p>

                  {/* Options review for MULTIPLE_CHOICE & TRUE_FALSE */}
                  {(q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'TRUE_FALSE') && (
                    <div className="space-y-2 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isSelectedByStudent = (studentAnswer?.selectedOptionIds ?? []).includes(opt.id);
                        const isCorrectOption = opt.isCorrect === true;

                        return (
                          <div
                            key={opt.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border text-xs sm:text-sm font-medium ${
                              isCorrectOption
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 font-semibold'
                                : isSelectedByStudent
                                ? 'border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200'
                                : 'border-border/60 bg-muted/10 text-muted-foreground'
                            }`}
                          >
                            <span className="font-bold mr-1">{String.fromCharCode(65 + optIdx)}.</span>
                            <div className="flex-1 leading-relaxed">{opt.content}</div>
                            {isSelectedByStudent && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-background border border-border">
                                Bạn chọn
                              </span>
                            )}
                            {isCorrectOption && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500 text-white">
                                Đáp án đúng
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Essay or Text review */}
                  {(q.questionType === 'SHORT_ESSAY' || q.questionType === 'ESSAY') && (
                    <div className="space-y-2 pt-1">
                      <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground">Bài làm của bạn:</span>
                        <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {studentAnswer?.textAnswer || '(Chưa làm câu này)'}
                        </p>
                      </div>
                      {q.referenceAnswer && (
                        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
                          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                            Đáp án tham khảo / Hướng dẫn chấm:
                          </span>
                          <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {q.referenceAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Explanation Callout */}
                  {q.explanation && (
                    <div className="p-3.5 rounded-xl border border-border bg-muted/30 text-xs space-y-1">
                      <span className="font-bold text-primary flex items-center gap-1.5">
                        <HelpCircle className="h-3.5 w-3.5" />
                        Lời giải chi tiết:
                      </span>
                      <p className="text-muted-foreground leading-relaxed pl-5">
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
