import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  Flag,
  Cloud,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  AlertCircle,
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
} from '@/shared/ui';
import {
  useQuizAttemptQuery,
  useSaveQuizAnswerMutation,
  useSubmitQuizAttemptMutation,
  type QuizQuestionDto,
} from '../api/quizApi';

type AutosaveState = 'idle' | 'saving' | 'saved' | 'error';
type SubmitModalType = 'none' | 'normal' | 'incomplete' | 'timeup';

export function QuizPlayerPage() {
  const { courseId, attemptId } = useParams<{ courseId?: string; attemptId: string }>();
  const navigate = useNavigate();

  const { data: attempt, isLoading, isError, error } = useQuizAttemptQuery(attemptId!);
  const { mutateAsync: saveAnswer } = useSaveQuizAnswerMutation(attemptId!);
  const { mutateAsync: submitAttempt, isPending: isSubmitting } = useSubmitQuizAttemptMutation(attemptId!);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<Set<string>>(new Set());
  const [autosaveState, setAutosaveState] = useState<AutosaveState>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [submitModal, setSubmitModal] = useState<SubmitModalType>('none');

  // Local answers cache: key = questionId, value = answer data
  const [answers, setAnswers] = useState<
    Record<
      string,
      {
        selectedOptionIds?: string[];
        textAnswer?: string;
        matches?: Record<string, string>;
      }
    >
  >({});

  // Countdown timer state
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const timerSubmittedRef = useRef(false);

  // Initialize answers from server attempt data
  useEffect(() => {
    if (!attempt || !attempt.questions) return;

    // If attempt is already SUBMITTED or GRADED, redirect to result page
    if (attempt.status !== 'IN_PROGRESS') {
      const target = courseId
        ? `/courses/${courseId}/quiz-attempts/${attempt.id}/result`
        : `/quiz-attempts/${attempt.id}/result`;
      navigate(target, { replace: true });
      return;
    }

    const initialAnswers: Record<string, any> = {};
    for (const q of attempt.questions) {
      if (q.studentAnswer) {
        initialAnswers[q.id] = {
          selectedOptionIds: q.studentAnswer.selectedOptionIds ?? [],
          textAnswer: q.studentAnswer.textAnswer ?? '',
          matches: q.studentAnswer.matches ?? {},
        };
      } else {
        initialAnswers[q.id] = {
          selectedOptionIds: [],
          textAnswer: '',
          matches: {},
        };
      }
    }
    setAnswers(initialAnswers);
  }, [attempt, courseId, navigate]);

  // Setup countdown timer
  useEffect(() => {
    if (!attempt?.deadlineAt) return;

    const calculateTimeLeft = () => {
      const deadline = new Date(attempt.deadlineAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((deadline - now) / 1000));
      return diff;
    };

    setTimeLeftSeconds(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeftSeconds(remaining);

      if (remaining <= 0 && !timerSubmittedRef.current) {
        timerSubmittedRef.current = true;
        clearInterval(interval);
        setSubmitModal('timeup');
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [attempt?.deadlineAt]);

  const questions = attempt?.questions ?? [];
  const currentQuestion: QuizQuestionDto | undefined = questions[currentIndex];

  // Debounced autosave ref
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSave = async (questionId: string, payload: {
    selectedOptionIds?: string[];
    textAnswer?: string;
    matches?: Record<string, string>;
  }) => {
    try {
      setAutosaveState('saving');
      await saveAnswer({
        questionId,
        selectedOptionIds: payload.selectedOptionIds,
        textAnswer: payload.textAnswer,
        matches: payload.matches,
      });
      setAutosaveState('saved');
      setLastSavedTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {
      setAutosaveState('error');
    }
  };

  const updateCurrentAnswer = (updater: (prev: any) => any) => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;

    setAnswers((prev) => {
      const current = prev[qId] ?? { selectedOptionIds: [], textAnswer: '', matches: {} };
      const updated = updater(current);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        triggerSave(qId, updated);
      }, 1500);

      return {
        ...prev,
        [qId]: updated,
      };
    });
  };

  const toggleFlag = (questionId: string) => {
    setFlaggedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  // Helper to determine if a question is answered
  const isQuestionAnswered = (q: QuizQuestionDto) => {
    const ans = answers[q.id];
    if (!ans) return false;
    if (ans.selectedOptionIds && ans.selectedOptionIds.length > 0) return true;
    if (ans.textAnswer && ans.textAnswer.trim().length > 0) return true;
    if (ans.matches && Object.keys(ans.matches).length > 0) return true;
    return false;
  };

  const answeredCount = questions.filter(isQuestionAnswered).length;
  const unansweredCount = questions.length - answeredCount;

  const handleOpenSubmitModal = () => {
    // Immediate flush save before opening submit
    if (currentQuestion) {
      const currentAns = answers[currentQuestion.id];
      if (currentAns) {
        triggerSave(currentQuestion.id, currentAns);
      }
    }

    if (unansweredCount > 0) {
      setSubmitModal('incomplete');
    } else {
      setSubmitModal('normal');
    }
  };

  const handleConfirmSubmit = async () => {
    try {
      const result = await submitAttempt();
      setSubmitModal('none');
      const target = courseId
        ? `/courses/${courseId}/quiz-attempts/${result.attemptId}/result`
        : `/quiz-attempts/${result.attemptId}/result`;
      navigate(target, { replace: true });
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi nộp bài. Vui lòng thử lại.');
    }
  };

  const handleAutoSubmit = async () => {
    try {
      const result = await submitAttempt();
      const target = courseId
        ? `/courses/${courseId}/quiz-attempts/${result.attemptId}/result`
        : `/quiz-attempts/${result.attemptId}/result`;
      navigate(target, { replace: true });
    } catch {
      // ignore auto-submit error, user can still review or retry
    }
  };

  // Format time remaining
  const formattedTime = useMemo(() => {
    if (timeLeftSeconds == null) return '--:--';
    const hours = Math.floor(timeLeftSeconds / 3600);
    const minutes = Math.floor((timeLeftSeconds % 3600) / 60);
    const seconds = timeLeftSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }, [timeLeftSeconds]);

  const isUrgentTime = timeLeftSeconds != null && timeLeftSeconds <= 300; // < 5 mins
  const isCriticalTime = timeLeftSeconds != null && timeLeftSeconds <= 60; // < 1 min

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Đang tải đề thi và thông tin lượt làm bài...</p>
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
          <h2 className="text-lg font-bold text-foreground">Không tìm thấy bài thi</h2>
          <p className="text-xs text-muted-foreground">
            {error instanceof Error ? error.message : 'Lượt thi này không tồn tại hoặc bạn không có quyền truy cập.'}
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

  return (
    <div className="min-h-screen flex flex-col bg-muted/20 text-foreground selection:bg-primary/20">
      {/* Top Navbar Header (SCR-LRN-03) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Lần thi {attempt.attemptNo} • {questions.length} câu hỏi
            </span>
            <h1 className="text-sm sm:text-base font-bold text-foreground truncate max-w-[200px] sm:max-w-md">
              Bài kiểm tra đánh giá kiến thức
            </h1>
          </div>
        </div>

        {/* Center: Countdown Timer */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-bold text-xs sm:text-sm transition-colors ${
              isCriticalTime
                ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                : isUrgentTime
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-muted border-border text-foreground'
            }`}
          >
            <Clock className={`h-4 w-4 ${isCriticalTime ? 'text-white' : 'text-primary'}`} />
            <span>{formattedTime}</span>
          </div>

          {/* Autosave Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground px-2 py-1">
            {autosaveState === 'saving' && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Đang lưu...</span>
              </>
            )}
            {autosaveState === 'saved' && (
              <>
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                <span>Đã lưu {lastSavedTime ? `(${lastSavedTime})` : ''}</span>
              </>
            )}
            {autosaveState === 'error' && (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-rose-500">Lỗi lưu</span>
              </>
            )}
            {autosaveState === 'idle' && (
              <>
                <Cloud className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span>Tự động lưu</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Submit Button */}
        <div>
          <Button
            type="button"
            variant="primary"
            onClick={handleOpenSubmitModal}
            disabled={isSubmitting}
            className="h-9 px-4 text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Nộp bài thi</span>
          </Button>
        </div>
      </header>

      {/* Main Body: 2 Columns (Content & Navigation) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Question Content (3 Cols) */}
        <main className="lg:col-span-3 space-y-5">
          {currentQuestion ? (
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-border/70 pb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs h-6 px-2.5">
                    Câu {currentIndex + 1}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    ({currentQuestion.maxPoints} điểm)
                  </span>
                  <span className="text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase">
                    {currentQuestion.questionType}
                  </span>
                </div>

                {/* Flag Question Button */}
                <Button
                  type="button"
                  variant={flaggedQuestionIds.has(currentQuestion.id) ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => toggleFlag(currentQuestion.id)}
                  className={`h-8 px-2.5 text-xs font-medium gap-1.5 ${
                    flaggedQuestionIds.has(currentQuestion.id)
                      ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Flag className={`h-3.5 w-3.5 ${flaggedQuestionIds.has(currentQuestion.id) ? 'fill-current' : ''}`} />
                  <span>{flaggedQuestionIds.has(currentQuestion.id) ? 'Đã gắn cờ' : 'Gắn cờ xem lại'}</span>
                </Button>
              </div>

              {/* Question Stem */}
              <div className="text-base sm:text-lg font-medium text-foreground leading-relaxed whitespace-pre-wrap">
                {currentQuestion.stem}
              </div>

              {/* Question Answer Inputs by Type */}
              <div className="space-y-4 pt-2">
                {/* 1. MULTIPLE CHOICE */}
                {currentQuestion.questionType === 'MULTIPLE_CHOICE' && (
                  <div className="space-y-2.5">
                    {currentQuestion.allowMultiple && (
                      <p className="text-xs text-primary font-semibold">
                        * Bạn có thể chọn nhiều hơn một đáp án đúng.
                      </p>
                    )}
                    {currentQuestion.options.map((opt, idx) => {
                      const selectedIds = answers[currentQuestion.id]?.selectedOptionIds ?? [];
                      const isSelected = selectedIds.includes(opt.id);

                      const handleSelect = () => {
                        updateCurrentAnswer((prev) => {
                          if (currentQuestion.allowMultiple) {
                            const currentList = prev.selectedOptionIds ?? [];
                            const nextList = currentList.includes(opt.id)
                              ? currentList.filter((id: string) => id !== opt.id)
                              : [...currentList, opt.id];
                            return { ...prev, selectedOptionIds: nextList };
                          } else {
                            return { ...prev, selectedOptionIds: [opt.id] };
                          }
                        });
                      };

                      return (
                        <div
                          key={opt.id}
                          onClick={handleSelect}
                          className={`flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all select-none ${
                            isSelected
                              ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary/40'
                              : 'border-border bg-card hover:bg-muted/30 text-foreground'
                          }`}
                        >
                          <div
                            className={`h-5 w-5 rounded-${currentQuestion.allowMultiple ? 'md' : 'full'} border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-muted-foreground/40 bg-background'
                            }`}
                          >
                            {isSelected && (
                              <span className="text-[10px] font-bold">
                                {currentQuestion.allowMultiple ? '✓' : '●'}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 text-sm font-medium leading-relaxed">
                            <span className="font-bold mr-2 text-muted-foreground">
                              {String.fromCharCode(65 + idx)}.
                            </span>
                            {opt.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. TRUE FALSE */}
                {currentQuestion.questionType === 'TRUE_FALSE' && (
                  <div className="grid grid-cols-2 gap-4">
                    {['Đúng', 'Sai'].map((label) => {
                      const opt = currentQuestion.options.find(
                        (o) => o.content.toLowerCase() === label.toLowerCase()
                      ) || currentQuestion.options[label === 'Đúng' ? 0 : 1];

                      const selectedIds = answers[currentQuestion.id]?.selectedOptionIds ?? [];
                      const isSelected = opt && selectedIds.includes(opt.id);

                      const handleSelect = () => {
                        if (!opt) return;
                        updateCurrentAnswer((prev) => ({
                          ...prev,
                          selectedOptionIds: [opt.id],
                        }));
                      };

                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={handleSelect}
                          className={`p-5 rounded-2xl border text-center font-bold text-base transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/40 shadow-sm'
                              : 'border-border bg-card hover:bg-muted/40 text-foreground'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 3. FILL BLANK */}
                {currentQuestion.questionType === 'FILL_BLANK' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Điền từ hoặc cụm từ thích hợp vào từng ô trống bên dưới:
                    </p>
                    <div className="space-y-2.5">
                      {currentQuestion.options.map((opt, bIdx) => {
                        const currentText = answers[currentQuestion.id]?.textAnswer ?? '';
                        const parts = currentText.split(';');
                        const val = parts[bIdx] ?? '';

                        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                          const newVal = e.target.value.replace(/;/g, ' ');
                          const nextParts = [...parts];
                          while (nextParts.length <= bIdx) nextParts.push('');
                          nextParts[bIdx] = newVal;
                          updateCurrentAnswer((prev) => ({
                            ...prev,
                            textAnswer: nextParts.join(';'),
                          }));
                        };

                        return (
                          <div key={opt.id || bIdx} className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-muted-foreground w-20 shrink-0">
                              Ô trống #{bIdx + 1}:
                            </span>
                            <Input
                              type="text"
                              value={val}
                              onChange={handleChange}
                              placeholder={`Nhập đáp án cho ô trống ${bIdx + 1}...`}
                              className="text-xs h-9 flex-1"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. MATCHING */}
                {currentQuestion.questionType === 'MATCHING' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Nối từng thuật ngữ ở vế trái với định nghĩa tương ứng ở vế phải:
                    </p>
                    <div className="space-y-3">
                      {currentQuestion.options.map((opt) => {
                        const currentMatches = answers[currentQuestion.id]?.matches ?? {};
                        const selectedRight = currentMatches[opt.id] ?? '';

                        const handleMatchSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
                          const val = e.target.value;
                          updateCurrentAnswer((prev) => ({
                            ...prev,
                            matches: {
                              ...(prev.matches ?? {}),
                              [opt.id]: val,
                            },
                          }));
                        };

                        return (
                          <div
                            key={opt.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-muted/20"
                          >
                            <span className="text-xs sm:text-sm font-semibold text-foreground flex-1">
                              {opt.content}
                            </span>
                            <div className="sm:w-64">
                              <select
                                value={selectedRight}
                                onChange={handleMatchSelect}
                                className="w-full h-9 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                <option value="">-- Chọn vế phải tương ứng --</option>
                                {currentQuestion.options.map((rightOpt) => (
                                  <option
                                    key={rightOpt.id}
                                    value={rightOpt.matchContent || rightOpt.content}
                                  >
                                    {rightOpt.matchContent || rightOpt.content}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. ESSAY */}
                {(currentQuestion.questionType === 'SHORT_ESSAY' || currentQuestion.questionType === 'ESSAY') && (
                  <div className="space-y-2">
                    <label htmlFor="essay-answer" className="text-xs font-semibold text-foreground">
                      Bài làm tự luận của bạn:
                    </label>
                    <textarea
                      id="essay-answer"
                      rows={8}
                      value={answers[currentQuestion.id]?.textAnswer ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateCurrentAnswer((prev) => ({
                          ...prev,
                          textAnswer: val,
                        }));
                      }}
                      placeholder="Nhập câu trả lời chi tiết của bạn tại đây..."
                      className="w-full rounded-xl border border-border bg-background p-3.5 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                    />
                    <div className="flex justify-end text-[11px] text-muted-foreground">
                      {(answers[currentQuestion.id]?.textAnswer ?? '').length} ký tự
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Navigation Buttons */}
              <div className="flex items-center justify-between border-t border-border/70 pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
                  disabled={currentIndex === 0}
                  className="h-9 px-3.5 text-xs font-semibold gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Câu trước
                </Button>

                <div className="text-xs text-muted-foreground font-medium">
                  {currentIndex + 1} / {questions.length}
                </div>

                {currentIndex < questions.length - 1 ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setCurrentIndex((idx) => Math.min(questions.length - 1, idx + 1))}
                    className="h-9 px-3.5 text-xs font-semibold gap-1.5"
                  >
                    Câu sau
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleOpenSubmitModal}
                    className="h-9 px-4 text-xs font-semibold gap-1.5"
                  >
                    Hoàn thành & Nộp
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground text-xs">
              Chưa có câu hỏi nào trong bài kiểm tra này.
            </div>
          )}
        </main>

        {/* Right Column: Question Navigator Sidebar (1 Col) */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="sticky top-20 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Danh sách câu hỏi
              </h3>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                <span>Đã làm: {answeredCount}/{questions.length}</span>
                <span>Gắn cờ: {flaggedQuestionIds.size}</span>
              </div>
            </div>

            {/* Questions Grid Palette */}
            <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto p-0.5">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = isQuestionAnswered(q);
                const isFlagged = flaggedQuestionIds.has(q.id);

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                      isCurrent
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background z-10'
                        : ''
                    } ${
                      isAnswered
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border border-border bg-muted/40 hover:bg-muted text-foreground'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-background" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="space-y-1.5 text-[11px] text-muted-foreground border-t border-border pt-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-primary" />
                <span>Đã trả lời</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-border bg-muted/40" />
                <span>Chưa trả lời</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-amber-500" />
                <span>Đã gắn cờ</span>
              </div>
            </div>

            {/* Quick Submit Button */}
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenSubmitModal}
                disabled={isSubmitting}
                className="w-full h-9 text-xs font-semibold gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Nộp bài ngay
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* Submit Confirmation Dialog - Variant 1: Normal Submit */}
      <Dialog
        open={submitModal === 'normal'}
        onOpenChange={(open) => !open && setSubmitModal('none')}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary mb-1">
              <CheckCircle className="h-5 w-5" />
              <DialogTitle>Xác nhận nộp bài thi</DialogTitle>
            </div>
            <DialogDescription>
              Bạn đã hoàn thành toàn bộ <strong>{answeredCount}/{questions.length}</strong> câu hỏi. Bạn có chắc chắn muốn nộp bài để kết thúc lần thi này không?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubmitModal('none')}
              disabled={isSubmitting}
            >
              Tiếp tục làm
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang nộp bài...' : 'Đồng ý nộp bài'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Confirmation Dialog - Variant 2: Incomplete Warning */}
      <Dialog
        open={submitModal === 'incomplete'}
        onOpenChange={(open) => !open && setSubmitModal('none')}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-500 mb-1">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Cảnh báo: Còn câu hỏi chưa trả lời</DialogTitle>
            </div>
            <DialogDescription>
              Bạn còn <strong>{unansweredCount}</strong> câu hỏi chưa trả lời (mới hoàn thành {answeredCount}/{questions.length} câu). Những câu chưa làm sẽ được tính 0 điểm. Bạn có chắc muốn nộp ngay không?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubmitModal('none')}
              disabled={isSubmitting}
            >
              Quay lại làm tiếp
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang nộp...' : 'Vẫn muốn nộp bài'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Confirmation Dialog - Variant 3: Time-Up Auto-Submit */}
      <Dialog open={submitModal === 'timeup'} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-500 mb-1">
              <Clock className="h-5 w-5" />
              <DialogTitle>Đã hết giờ làm bài!</DialogTitle>
            </div>
            <DialogDescription>
              Thời gian làm bài của bạn đã kết thúc. Hệ thống đang tự động lưu các câu trả lời hiện tại và nộp bài để chấm điểm...
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-xs text-muted-foreground mt-2">Đang xử lý kết quả chấm tự động...</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
