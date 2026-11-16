import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  Clock,
  Award,
  RotateCcw,
  Lock,
  Play,
  CheckCircle2,
  XCircle,
  FileQuestion,
  ExternalLink,
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
import { useQuizAttemptsQuery, useStartQuizAttemptMutation } from '../api/quizApi';

interface QuizBlockCardProps {
  courseId: string;
  blockId: string;
  title?: string;
  description?: string;
  timeLimitMinutes?: number;
  maxAttempts?: number;
  passScorePercent?: number;
  hasPassword?: boolean;
}

export function QuizBlockCard({
  courseId,
  blockId,
  title = 'Bài kiểm tra đánh giá',
  description,
  timeLimitMinutes,
  maxAttempts,
  passScorePercent = 70,
  hasPassword = false,
}: QuizBlockCardProps) {
  const navigate = useNavigate();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const { data: attempts = [] } = useQuizAttemptsQuery(courseId, blockId);
  const { mutateAsync: startAttempt, isPending: isStarting } = useStartQuizAttemptMutation(courseId, blockId);

  // Check if there is an active in-progress attempt
  const activeAttempt = attempts.find((a) => a.status === 'IN_PROGRESS');
  const attemptsCount = attempts.length;
  const isAttemptsExhausted = Boolean(maxAttempts && maxAttempts > 0 && attemptsCount >= maxAttempts && !activeAttempt);

  const handleStart = async (attemptPassword?: string) => {
    try {
      setPasswordError('');
      const attempt = await startAttempt({ password: attemptPassword || undefined });
      setPasswordModalOpen(false);
      navigate(`/courses/${courseId}/quiz-attempts/${attempt.id}`);
    } catch (err: any) {
      if (err?.code === 'QUIZ_PASSWORD_INVALID' || err?.status === 400) {
        setPasswordError('Mật khẩu bài thi không chính xác. Vui lòng thử lại.');
      } else if (err?.code === 'Quiz.MaxAttemptsReached' || err?.status === 409) {
        setPasswordError('Bạn đã dùng hết số lượt làm bài kiểm tra này.');
      } else {
        setPasswordError(err?.detail || err?.message || 'Không thể bắt đầu bài kiểm tra. Vui lòng thử lại.');
      }
    }
  };

  const handleButtonClick = () => {
    if (activeAttempt) {
      navigate(`/courses/${courseId}/quiz-attempts/${activeAttempt.attemptId}`);
      return;
    }

    if (hasPassword) {
      setPasswordModalOpen(true);
    } else {
      handleStart();
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              <FileQuestion className="h-3.5 w-3.5" />
              Bài kiểm tra (Quiz)
            </span>
            {hasPassword && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                <Lock className="h-3 w-3" />
                Mật khẩu
              </span>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-bold text-foreground">{title}</h3>
          {description && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>

        {/* Action Button */}
        <div className="shrink-0">
          <Button
            type="button"
            variant="primary"
            onClick={handleButtonClick}
            disabled={isStarting || isAttemptsExhausted}
            className="w-full sm:w-auto h-9 px-4 text-xs font-semibold gap-1.5 shadow-sm"
          >
            {isStarting ? (
              'Đang chuẩn bị đề...'
            ) : activeAttempt ? (
              <>
                <Play className="h-4 w-4 fill-current" />
                Tiếp tục làm bài (Lần {attemptsCount})
              </>
            ) : isAttemptsExhausted ? (
              'Đã hết số lượt thi'
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                {attemptsCount > 0 ? `Làm lại bài thi (Lần ${attemptsCount + 1})` : 'Bắt đầu làm bài'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Overview Info Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>Thời gian</span>
          </div>
          <p className="text-sm font-bold text-foreground">
            {timeLimitMinutes && timeLimitMinutes > 0 ? `${timeLimitMinutes} phút` : 'Không giới hạn'}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Award className="h-3.5 w-3.5 text-primary" />
            <span>Ngưỡng đạt</span>
          </div>
          <p className="text-sm font-bold text-foreground">{passScorePercent}% điểm</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5 text-primary" />
            <span>Số lượt thi</span>
          </div>
          <p className="text-sm font-bold text-foreground">
            {maxAttempts && maxAttempts > 0 ? `${attemptsCount} / ${maxAttempts} lượt` : `${attemptsCount} lượt`}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <HelpCircle className="h-3.5 w-3.5 text-primary" />
            <span>Điểm cao nhất</span>
          </div>
          <p className="text-sm font-bold text-foreground">
            {attempts.length > 0
              ? `${Math.max(...attempts.map((a) => a.totalScore ?? 0)).toFixed(1)} đ`
              : 'Chưa có'}
          </p>
        </div>
      </div>

      {/* Attempts History */}
      {attempts.length > 0 && (
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Lịch sử làm bài ({attempts.length})
          </h4>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Lần thi</th>
                  <th className="py-2.5 px-3">Thời gian nộp</th>
                  <th className="py-2.5 px-3">Điểm số</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {attempts.map((att, idx) => {
                  const percent = att.maxScore > 0 ? ((att.totalScore ?? 0) / att.maxScore) * 100 : 0;
                  const isPassed = percent >= passScorePercent;

                  return (
                    <tr key={att.attemptId} className="hover:bg-muted/20">
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        Lần {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {att.submittedAt
                          ? new Date(att.submittedAt).toLocaleString('vi-VN')
                          : 'Đang làm bài'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">
                        {att.totalScore != null ? (
                          <span>
                            {att.totalScore.toFixed(1)} / {att.maxScore.toFixed(1)}{' '}
                            <span className="text-[10px] text-muted-foreground">({percent.toFixed(0)}%)</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Chưa có điểm</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {att.status === 'IN_PROGRESS' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            Đang làm
                          </span>
                        ) : isPassed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Đạt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                            <XCircle className="h-3 w-3" /> Chưa đạt
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {att.status !== 'IN_PROGRESS' && (
                          <button
                            type="button"
                            onClick={() => navigate(`/courses/${courseId}/quiz-attempts/${att.attemptId}/result`)}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                          >
                            Xem kết quả
                            <ExternalLink className="h-3 w-3" />
                          </button>
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

      {/* Password Modal */}
      <Dialog open={passwordModalOpen} onOpenChange={(open) => !open && setPasswordModalOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary mb-1">
              <Lock className="h-5 w-5" />
              <DialogTitle>Mật khẩu bài kiểm tra</DialogTitle>
            </div>
            <DialogDescription>
              Bài kiểm tra này được giảng viên thiết lập mật khẩu bảo vệ. Vui lòng nhập mật khẩu để mở đề thi.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleStart(password);
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <label htmlFor="quiz-password-input" className="text-xs font-semibold text-foreground">
                Mật khẩu truy cập bài thi
              </label>
              <Input
                id="quiz-password-input"
                type="password"
                placeholder="Nhập mật khẩu bài thi..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
              />
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordModalOpen(false)}
                disabled={isStarting}
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isStarting || !password.trim()}
              >
                {isStarting ? 'Đang mở đề...' : 'Vào làm bài'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
