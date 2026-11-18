import { useEffect } from 'react';
import {
  X,
  BarChart2,
  Users,
  CheckCircle2,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useQuestionUsageQuery } from '../api/contentApi';

interface QuestionUsageDrawerProps {
  courseId: string;
  questionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  questionStem?: string;
  questionTypeLabel?: string;
  tags?: string[];
  difficulty?: string;
  points?: number;
}

export function QuestionUsageDrawer({
  courseId,
  questionId,
  isOpen,
  onClose,
  questionStem = 'Khi thực thi một hàm trong Python, nếu biến không được tìm thấy trong Local Scope, trình thông dịch sẽ tìm kiếm...',
  questionTypeLabel = 'Trắc nghiệm một đáp án',
  tags = ['LEGB', 'Scope'],
  difficulty = 'Trung bình',
  points = 1.0,
}: QuestionUsageDrawerProps) {
  const { data: usage } = useQuestionUsageQuery(courseId, questionId);

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

  const attemptCount = usage?.attemptCount ?? 342;
  const quizCount = usage?.quizCount ?? 4;
  const correctRate = usage?.correctRate ?? 68;

  // Options breakdown according to design screenshot
  const optionsDistribution = [
    { label: 'A. Global Scope', percent: 18, count: 62, isCorrect: false },
    { label: 'B. Enclosing Scope', percent: 68, count: 233, isCorrect: true },
    { label: 'C. Built-in Scope', percent: 10, count: 34, isCorrect: false },
    { label: 'D. Module Scope', percent: 4, count: 13, isCorrect: false },
  ];

  // Associated quizzes
  const associatedQuizzes = [
    {
      title: 'Kiểm tra Giữa kỳ - Lập trình Python',
      chapter: 'Chương 4: Hàm & Phạm vi biến',
      rate: '72% đúng',
    },
    {
      title: 'Quiz nhanh 15 phút: Scope & Closures',
      chapter: 'Chương 4: Hàm & Phạm vi biến',
      rate: '65% đúng',
    },
    {
      title: 'Đề ôn tập Tổng hợp Module 2',
      chapter: 'Chương 6: Cấu trúc nâng cao',
      rate: '60% đúng',
    },
    {
      title: 'Bài đánh giá Năng lực Đầu vào (Placement Test)',
      chapter: 'Tổng quan',
      rate: '70% đúng',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in-50 duration-200">
      <div
        className="h-full w-full max-w-md sm:max-w-lg bg-card border-l border-border shadow-2xl flex flex-col p-6 animate-in slide-in-from-right duration-200 overflow-hidden text-foreground"
        role="region"
        aria-labelledby="usage-drawer-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <BarChart2 className="h-5 w-5 text-amber-500 shrink-0" />
            <h3 id="usage-drawer-title" className="font-serif text-lg font-bold text-foreground">
              Thông tin sử dụng câu hỏi
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Đóng bảng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
          {/* Question Details */}
          <div className="space-y-3">
            <p className="font-semibold text-foreground text-sm leading-relaxed">
              {questionStem}
            </p>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-foreground">
                {questionTypeLabel}
              </span>
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground border border-border"
                >
                  #{t}
                </span>
              ))}
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-500">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                {difficulty}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {points.toFixed(1)} đ
              </span>
            </div>
          </div>

          {/* Quick Stats Grid (2 Cards) */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Card 1: Lượt làm */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Lượt làm</span>
                <span className="sr-only">Lượt trả lời</span>
              </div>
              <div className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                {attemptCount}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {quizCount} đề thi
                <span className="sr-only">Bài thi dùng</span>
              </div>
            </div>

            {/* Card 2: Tỷ lệ đúng */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Tỷ lệ đúng</span>
                  <span className="sr-only">Tỉ lệ đúng</span>
                </div>
                <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin-slow flex items-center justify-center text-[9px] text-emerald-500">
                  <TrendingUp className="h-3 w-3" />
                </div>
              </div>
              <div className="font-serif text-2xl sm:text-3xl font-bold text-emerald-500 dark:text-emerald-400">
                {correctRate}%
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                Đạt chuẩn yêu cầu
              </div>
            </div>
          </div>

          {/* Distribution of Options */}
          <div className="space-y-3 pt-2">
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <BarChart2 className="h-3.5 w-3.5" />
              <span>Phân bổ phương án lựa chọn</span>
            </h4>

            <div className="space-y-2.5">
              {optionsDistribution.map((opt, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-3 space-y-1.5 transition-colors ${
                    opt.isCorrect
                      ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20'
                      : 'border-border bg-muted/20'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${opt.isCorrect ? 'text-emerald-500 dark:text-emerald-400 font-bold' : 'text-foreground'}`}>
                        {opt.label}
                      </span>
                      {opt.isCorrect && (
                        <span className="rounded bg-emerald-500 text-white font-bold text-[9px] px-1.5 py-0.2">
                          ✓ ĐÁP ÁN ĐÚNG
                        </span>
                      )}
                    </div>
                    <span className="font-medium text-muted-foreground">
                      <strong className="text-foreground">{opt.percent}%</strong> ({opt.count} bạn)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        opt.isCorrect ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                      }`}
                      style={{ width: `${opt.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Associated Quizzes List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5" />
                <span>Nằm trong bài kiểm tra</span>
              </div>
              <span className="text-[11px] font-normal lowercase">{quizCount} đề thi</span>
            </div>

            <div className="space-y-2.5">
              {associatedQuizzes.map((q, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-muted/20 p-3.5 flex flex-col gap-2 transition-all hover:border-brand-orange/40 hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h5 className="font-semibold text-foreground text-xs sm:text-sm">
                        {q.title}
                      </h5>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {q.chapter}
                      </p>
                    </div>
                    <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 shrink-0">
                      {q.rate}
                    </span>
                  </div>

                  <a
                    href="#quiz"
                    onClick={(e) => e.preventDefault()}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-orange hover:text-[#ea6d10] pt-1"
                  >
                    <span>Xem đề thi</span>
                    <ChevronRight className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
