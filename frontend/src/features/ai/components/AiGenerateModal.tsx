import { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Layers,
  FileText,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import { useAiQuota, useCreateQuizJob, useCreateFlashcardJob, useAiJob } from '../api/aiApi';
import type { AiJobDto, AiSourceKind } from '../types';

interface AiGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  defaultTab?: 'QUIZ' | 'FLASHCARD';
  chapters?: Array<{ id: string; title: string }>;
  currentChapterId?: string;
  onSuccess?: (job: AiJobDto) => void;
}

export function AiGenerateModal({
  isOpen,
  onClose,
  courseId,
  defaultTab = 'QUIZ',
  chapters = [],
  currentChapterId,
  onSuccess,
}: AiGenerateModalProps) {
  const [activeTab, setActiveTab] = useState<'QUIZ' | 'FLASHCARD'>(defaultTab);
  const [sourceKind, setSourceKind] = useState<AiSourceKind>('PASTED_TEXT');
  const [sourceText, setSourceText] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>(currentChapterId || (chapters[0]?.id ?? ''));
  const [count, setCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<string>('MEDIUM');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: quota, isLoading: isQuotaLoading, refetch: refetchQuota } = useAiQuota();
  const createQuizMutation = useCreateQuizJob(courseId);
  const createFlashcardMutation = useCreateFlashcardJob(courseId);
  const { data: jobData } = useAiJob(activeJobId, !!activeJobId);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      if (currentChapterId) {
        setSelectedChapterId(currentChapterId);
      }
      setActiveJobId(null);
      setErrorMsg(null);
      refetchQuota();
    }
  }, [isOpen, defaultTab, currentChapterId, refetchQuota]);

  if (!isOpen) return null;

  const handleStartGeneration = async () => {
    setErrorMsg(null);
    try {
      if (activeTab === 'QUIZ') {
        const body = {
          sourceKind,
          sourceText: sourceKind === 'PASTED_TEXT' ? sourceText : undefined,
          sourceChapterId: sourceKind === 'CHAPTER' ? selectedChapterId : undefined,
          count,
          difficulty,
          typeFilter: ['MULTIPLE_CHOICE'],
        };
        const job = await createQuizMutation.mutateAsync(body);
        setActiveJobId((job as any)?.id || (job as any)?.jobId);
      } else {
        const targetChapter = selectedChapterId || currentChapterId;
        if (!targetChapter) {
          setErrorMsg('Vui lòng chọn chương học để gắn flashcard.');
          return;
        }
        const body = {
          sourceKind: sourceKind === 'CHAPTER' ? 'CHAPTER' as const : 'PASTED_TEXT' as const,
          sourceText: sourceKind === 'PASTED_TEXT' ? sourceText : undefined,
          sourceChapterId: targetChapter,
          count,
        };
        const job = await createFlashcardMutation.mutateAsync(body);
        setActiveJobId((job as any)?.id || (job as any)?.jobId);
      }
    } catch (err: any) {
      const msg = err?.detail || err?.message || 'Có lỗi xảy ra khi yêu cầu tạo nội dung AI.';
      setErrorMsg(msg);
    }
  };

  const isGenerating = !!activeJobId && (jobData?.status === 'PENDING' || jobData?.status === 'RUNNING');
  const isCompleted = jobData?.status === 'COMPLETED';
  const isFailed = jobData?.status === 'FAILED' || !!errorMsg;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Tạo nội dung với AI
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 font-medium">
                  {activeTab === 'QUIZ' ? 'SCR-AI-01' : 'SCR-AI-02'}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Sinh tự động câu hỏi trắc nghiệm hoặc flashcard nháp từ tài liệu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quota bar */}
        <div className="px-6 py-2.5 bg-purple-50/50 dark:bg-purple-950/20 border-b border-purple-100 dark:border-purple-900/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <Bot className="h-4 w-4" />
            <span>Hạn mức AI hôm nay (UTC):</span>
          </div>
          <div className="flex items-center gap-2">
            {isQuotaLoading ? (
              <span className="text-muted-foreground">Đang tải...</span>
            ) : quota ? (
              <span className="font-semibold text-purple-700 dark:text-purple-300">
                Còn lại {quota.remaining} / {quota.limit} lượt
              </span>
            ) : (
              <span className="text-muted-foreground">20 lượt / ngày</span>
            )}
          </div>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Tabs */}
          {!activeJobId && (
            <div className="flex border-b border-border gap-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('QUIZ');
                  setErrorMsg(null);
                }}
                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === 'QUIZ'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="h-4 w-4" />
                Sinh câu hỏi Quiz (SCR-AI-01)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('FLASHCARD');
                  setErrorMsg(null);
                }}
                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === 'FLASHCARD'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layers className="h-4 w-4" />
                Sinh Flashcard (SCR-AI-02)
              </button>
            </div>
          )}

          {/* Job Processing State */}
          {isGenerating && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-600 animate-spin flex items-center justify-center" />
                <Sparkles className="h-6 w-6 text-purple-500 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  AI đang xử lý yêu cầu...
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Đang phân tích tài liệu và cấu trúc hóa nội dung học tập. Hệ thống tự động kiểm tra mỗi 2 giây.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Trạng thái: {jobData?.status ?? 'PENDING'}
              </span>
            </div>
          )}

          {/* Job Completed State */}
          {isCompleted && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">
                  Tạo nội dung AI hoàn tất!
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Đã tạo thành công <strong className="text-foreground">{jobData.resultCount ?? count}</strong>{' '}
                  {activeTab === 'QUIZ'
                    ? 'câu hỏi vào Ngân hàng câu hỏi ở trạng thái Nháp (DRAFT).'
                    : 'thẻ ghi nhớ (Flashcard) vào chương học ở trạng thái Chờ duyệt (PENDING).'}
                </p>
              </div>
              <div className="pt-2 flex gap-3">
                <Button
                  variant="primary"
                  onClick={() => {
                    if (onSuccess && jobData) onSuccess(jobData);
                    onClose();
                  }}
                >
                  Xác nhận & Xem nội dung
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveJobId(null);
                    setSourceText('');
                  }}
                >
                  Tiếp tục tạo thêm
                </Button>
              </div>
            </div>
          )}

          {/* Form when not processing */}
          {!activeJobId && (
            <div className="space-y-4">
              {/* Input source selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground block">
                  Nguồn dữ liệu đầu vào:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSourceKind('PASTED_TEXT')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      sourceKind === 'PASTED_TEXT'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border bg-card hover:bg-muted/50'
                    }`}
                  >
                    <FileText className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-foreground">Dán văn bản trực tiếp</div>
                      <div className="text-[11px] text-muted-foreground">Nhập đoạn văn, tóm tắt hoặc ghi chú</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceKind('CHAPTER')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      sourceKind === 'CHAPTER'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border bg-card hover:bg-muted/50'
                    }`}
                  >
                    <BookOpen className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-foreground">Từ chương học</div>
                      <div className="text-[11px] text-muted-foreground">Trích xuất từ nội dung chương có sẵn</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Source Text Input */}
              {sourceKind === 'PASTED_TEXT' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-foreground">
                      Nội dung tài liệu: <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      {sourceText.length} ký tự
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="Dán nội dung bài học, tài liệu, slide hoặc văn bản cần tạo câu hỏi/flashcard tại đây..."
                    className="w-full text-xs p-3 rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none resize-none leading-relaxed"
                  />
                </div>
              )}

              {/* Chapter Selector */}
              {(sourceKind === 'CHAPTER' || activeTab === 'FLASHCARD') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {activeTab === 'FLASHCARD' ? 'Chương học đích (lưu Flashcard):' : 'Chọn chương học nguồn:'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  {chapters.length > 0 ? (
                    <select
                      value={selectedChapterId}
                      onChange={(e) => setSelectedChapterId(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      {chapters.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {ch.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                      Khóa học chưa có chương học nào khả dụng. Vui lòng tạo chương trước khi sinh nội dung.
                    </div>
                  )}
                </div>
              )}

              {/* Generation Parameters */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Số lượng {activeTab === 'QUIZ' ? 'câu hỏi' : 'thẻ'} (1 - 30):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={count}
                    onChange={(e) => setCount(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full text-xs p-2.5 rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                {activeTab === 'QUIZ' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Độ khó câu hỏi:
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      <option value="EASY">Dễ (Nhận biết)</option>
                      <option value="MEDIUM">Trung bình (Thông hiểu)</option>
                      <option value="HARD">Khó (Vận dụng cao)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Error Alert */}
              {isFailed && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Lỗi: </span>
                    {jobData?.errorMessage || errorMsg}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!activeJobId && (
          <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Mỗi lượt tạo tiêu tốn 1 hạn mức AI
            </span>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={onClose}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartGeneration}
                disabled={
                  (sourceKind === 'PASTED_TEXT' && !sourceText.trim()) ||
                  (sourceKind === 'CHAPTER' && !selectedChapterId) ||
                  (activeTab === 'FLASHCARD' && !selectedChapterId && !currentChapterId) ||
                  (quota?.remaining ?? 1) <= 0
                }
                className="flex items-center gap-1.5"
              >
                <Sparkles className="h-4 w-4" />
                Bắt đầu tạo ({activeTab === 'QUIZ' ? 'Quiz' : 'Flashcard'})
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
