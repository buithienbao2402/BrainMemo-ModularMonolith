import { useState, useEffect, useId } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  type QuestionType,
  type QuestionItemDto,
  type QuestionOptionItem,
  type UpsertQuestionRequest,
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
} from '../api/contentApi';
import { Button, Input } from '@/shared/ui';

interface QuestionEditorModalProps {
  courseId: string;
  question?: QuestionItemDto | null;
  isOpen: boolean;
  onClose: () => void;
  onViewUsage?: (questionId: string) => void;
}

export function QuestionEditorModal({
  courseId,
  question,
  isOpen,
  onClose,
  onViewUsage,
}: QuestionEditorModalProps) {
  const titleId = useId();
  const createMutation = useCreateQuestionMutation(courseId);
  const updateMutation = useUpdateQuestionMutation(courseId, question?.id || '');

  const [questionType, setQuestionType] = useState<QuestionType>(
    question?.questionType || 'MULTIPLE_CHOICE'
  );
  const [stem, setStem] = useState(question?.stem || '');
  const [explanation, setExplanation] = useState(question?.explanation || '');
  const [referenceAnswer, setReferenceAnswer] = useState(question?.referenceAnswer || '');
  const [difficultyCode, setDifficultyCode] = useState<number>(question?.difficultyCode ?? 1);
  const [defaultPoints, setDefaultPoints] = useState<number>(question?.defaultPoints ?? 10);
  const [tagsInput, setTagsInput] = useState(question?.tags?.join(', ') || '');
  const [options, setOptions] = useState<QuestionOptionItem[]>(
    question?.options && question.options.length > 0
      ? question.options
      : [
          { position: 1, content: 'Lựa chọn A', isCorrect: true },
          { position: 2, content: 'Lựa chọn B', isCorrect: false },
        ]
  );

  useEffect(() => {
    if (question) {
      setQuestionType(question.questionType);
      setStem(question.stem);
      setExplanation(question.explanation || '');
      setReferenceAnswer(question.referenceAnswer || '');
      setDifficultyCode(question.difficultyCode ?? 1);
      setDefaultPoints(question.defaultPoints);
      setTagsInput(question.tags?.join(', ') || '');
      setOptions(question.options || []);
    } else {
      setQuestionType('MULTIPLE_CHOICE');
      setStem('');
      setExplanation('');
      setReferenceAnswer('');
      setDifficultyCode(1);
      setDefaultPoints(10);
      setTagsInput('');
      setOptions([
        { position: 1, content: 'Lựa chọn A', isCorrect: true },
        { position: 2, content: 'Lựa chọn B', isCorrect: false },
      ]);
    }
  }, [question, isOpen]);

  // When switching type, initialize reasonable default options
  const handleTypeChange = (newType: QuestionType) => {
    setQuestionType(newType);
    if (newType === 'TRUE_FALSE') {
      setOptions([
        { position: 1, content: 'Đúng', isCorrect: true },
        { position: 2, content: 'Sai', isCorrect: false },
      ]);
    } else if (newType === 'MATCHING') {
      setOptions([
        { position: 1, content: 'Thuật ngữ 1', matchContent: 'Định nghĩa 1' },
        { position: 2, content: 'Thuật ngữ 2', matchContent: 'Định nghĩa 2' },
      ]);
    } else if (newType === 'FILL_BLANK') {
      setOptions([
        { position: 1, content: 'từ điền 1', blankNo: 1, isCorrect: true },
      ]);
    } else if (newType === 'ESSAY') {
      setOptions([]);
    } else if (options.length === 0) {
      setOptions([
        { position: 1, content: 'Lựa chọn A', isCorrect: true },
        { position: 2, content: 'Lựa chọn B', isCorrect: false },
      ]);
    }
  };

  // Option handlers
  const handleAddOption = () => {
    const nextPos = options.length + 1;
    if (questionType === 'MATCHING') {
      setOptions([...options, { position: nextPos, content: `Thuật ngữ ${nextPos}`, matchContent: `Định nghĩa ${nextPos}` }]);
    } else if (questionType === 'FILL_BLANK') {
      setOptions([...options, { position: nextPos, content: '', blankNo: nextPos, isCorrect: true }]);
    } else {
      setOptions([...options, { position: nextPos, content: `Lựa chọn ${String.fromCharCode(64 + nextPos)}`, isCorrect: false }]);
    }
  };

  const handleRemoveOption = (index: number) => {
    const updated = options.filter((_, i) => i !== index).map((opt, i) => ({ ...opt, position: i + 1 }));
    setOptions(updated);
  };

  const handleOptionContentChange = (index: number, content: string) => {
    const updated = [...options];
    const prev = updated[index];
    if (prev) {
      updated[index] = { ...prev, content, position: prev.position ?? (index + 1) };
      setOptions(updated);
    }
  };

  const handleOptionMatchChange = (index: number, matchContent: string) => {
    const updated = [...options];
    const prev = updated[index];
    if (prev) {
      updated[index] = { ...prev, matchContent, position: prev.position ?? (index + 1) };
      setOptions(updated);
    }
  };

  const handleOptionCorrectToggle = (index: number) => {
    if (questionType === 'MULTIPLE_CHOICE' || questionType === 'TRUE_FALSE') {
      // Single correct option
      const updated = options.map((opt, i) => ({
        ...opt,
        position: opt.position ?? (i + 1),
        isCorrect: i === index,
      }));
      setOptions(updated);
    } else {
      // Multi-select toggle
      const updated = [...options];
      const prev = updated[index];
      if (prev) {
        updated[index] = { ...prev, isCorrect: !prev.isCorrect, position: prev.position ?? (index + 1) };
        setOptions(updated);
      }
    }
  };

  // Live validity calculation
  const validate = (): { isValid: boolean; message: string } => {
    if (!stem.trim()) return { isValid: false, message: 'Nội dung câu hỏi không được để trống' };
    if (defaultPoints <= 0) return { isValid: false, message: 'Điểm số phải lớn hơn 0' };

    if (questionType === 'MULTIPLE_CHOICE' || questionType === 'TRUE_FALSE') {
      if (options.length < 2) return { isValid: false, message: 'Cần ít nhất 2 phương án' };
      if (!options.some((o) => o.isCorrect)) return { isValid: false, message: 'Cần chọn 1 đáp án đúng' };
    } else if (questionType === 'MULTIPLE_SELECT') {
      if (options.length < 2) return { isValid: false, message: 'Cần ít nhất 2 phương án' };
      if (options.filter((o) => o.isCorrect).length < 2) {
        return { isValid: false, message: 'Cần chọn ít nhất 2 đáp án đúng cho dạng đa lựa chọn' };
      }
    } else if (questionType === 'MATCHING') {
      if (options.length < 2) return { isValid: false, message: 'Cần ít nhất 2 cặp ghép' };
      if (options.some((o) => !o.content.trim() || !o.matchContent?.trim())) {
        return { isValid: false, message: 'Tất cả các cặp ghép phải có đủ thuật ngữ và định nghĩa' };
      }
    } else if (questionType === 'FILL_BLANK') {
      if (options.length === 0 && !referenceAnswer.trim()) {
        return { isValid: false, message: 'Cần ít nhất 1 chỗ trống hoặc đáp án mẫu tham chiếu' };
      }
    }

    return { isValid: true, message: 'Sẵn sàng kích hoạt (READY)' };
  };

  const validation = validate();

  const handleSave = async () => {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const body: UpsertQuestionRequest = {
      questionType,
      stem,
      explanation: explanation.trim() || null,
      referenceAnswer: referenceAnswer.trim() || null,
      difficultyCode,
      defaultPoints,
      tags,
      options,
    };

    if (question) {
      await updateMutation.mutateAsync(body);
    } else {
      await createMutation.mutateAsync(body);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="relative w-full max-w-3xl rounded-xl border border-border bg-card shadow-2xl p-6 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 id={titleId} className="text-lg font-bold text-foreground">
                {question ? 'Chỉnh sửa câu hỏi' : 'Tạo mới câu hỏi'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Soạn thảo câu hỏi trắc nghiệm & tự luận chuẩn (SCR-CNT-05)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {question && onViewUsage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewUsage(question.id)}
                className="text-xs flex items-center gap-1.5"
              >
                <Layers className="h-3.5 w-3.5 text-primary" />
                Sử dụng ({question.usageCount ?? 0})
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Đóng">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* Status Alert */}
          <div
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-xs ${
              validation.isValid
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {validation.isValid ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>{validation.message}</span>
            </div>
            <span className="font-semibold uppercase px-2 py-0.5 rounded bg-card/60 border border-border">
              {validation.isValid ? 'READY' : 'DRAFT'}
            </span>
          </div>

          {/* Type & Difficulty Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Loại câu hỏi
              </label>
              <select
                value={questionType}
                onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="MULTIPLE_CHOICE">Trắc nghiệm 1 đáp án</option>
                <option value="MULTIPLE_SELECT">Trắc nghiệm nhiều đáp án</option>
                <option value="TRUE_FALSE">Đúng / Sai</option>
                <option value="FILL_BLANK">Điền vào chỗ trống</option>
                <option value="MATCHING">Ghép cặp tương ứng</option>
                <option value="ESSAY">Tự luận / Trả lời ngắn</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Độ khó
              </label>
              <select
                value={difficultyCode}
                onChange={(e) => setDifficultyCode(Number(e.target.value))}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value={1}>Dễ (Cơ bản)</option>
                <option value={2}>Trung bình (Áp dụng)</option>
                <option value={3}>Khó (Nâng cao/Phân tích)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Điểm số mặc định
              </label>
              <Input
                type="number"
                min={1}
                max={100}
                value={defaultPoints}
                onChange={(e) => setDefaultPoints(Number(e.target.value) || 0)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Stem Input */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Nội dung câu hỏi (Stem) <span className="text-destructive">*</span>
            </label>
            <textarea
              rows={3}
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              placeholder="Nhập nội dung câu hỏi tại đây..."
              className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60 resize-y"
            />
          </div>

          {/* Question-Type Specific Options */}
          {questionType === 'ESSAY' ? (
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Gợi ý đáp án / Hướng dẫn chấm (Reference Answer)
              </label>
              <textarea
                rows={4}
                value={referenceAnswer}
                onChange={(e) => setReferenceAnswer(e.target.value)}
                placeholder="Nhập đáp án chuẩn hoặc tiêu chí chấm bài cho giảng viên..."
                className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60 resize-y"
              />
            </div>
          ) : questionType === 'MATCHING' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Các cặp ghép tương ứng (Term ↔ Match)
                </label>
                <Button variant="outline" size="sm" onClick={handleAddOption} className="text-xs h-8">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Thêm cặp
                </Button>
              </div>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-6 text-center">
                      {idx + 1}.
                    </span>
                    <Input
                      value={opt.content}
                      onChange={(e) => handleOptionContentChange(idx, e.target.value)}
                      placeholder="Thuật ngữ / Vế trái..."
                      className="text-xs flex-1"
                    />
                    <span className="text-muted-foreground font-bold">↔</span>
                    <Input
                      value={opt.matchContent || ''}
                      onChange={(e) => handleOptionMatchChange(idx, e.target.value)}
                      placeholder="Định nghĩa / Vế phải..."
                      className="text-xs flex-1"
                    />
                    {options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-destructive h-8 w-8 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : questionType === 'FILL_BLANK' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-foreground">
                    Các từ cần điền theo vị trí chỗ trống
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Có thể điền nhiều từ hợp lệ cách nhau bằng dấu chấm phẩy (;)
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleAddOption} className="text-xs h-8">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Thêm chỗ trống
                </Button>
              </div>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary w-20">
                      Chỗ trống {idx + 1}:
                    </span>
                    <Input
                      value={opt.content}
                      onChange={(e) => handleOptionContentChange(idx, e.target.value)}
                      placeholder="Ví dụ: Hà Nội; Ha Noi"
                      className="text-xs flex-1"
                    />
                    {options.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-destructive h-8 w-8 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* MULTIPLE_CHOICE, MULTIPLE_SELECT, TRUE_FALSE */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-foreground">
                    Các lựa chọn đáp án
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    {questionType === 'MULTIPLE_CHOICE' || questionType === 'TRUE_FALSE'
                      ? 'Chọn nút tròn để chỉ định 1 đáp án đúng'
                      : 'Đánh dấu ô để chọn các đáp án đúng (tối thiểu 2)'}
                  </p>
                </div>
                {questionType !== 'TRUE_FALSE' && (
                  <Button variant="outline" size="sm" onClick={handleAddOption} className="text-xs h-8">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Thêm lựa chọn
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type={questionType === 'MULTIPLE_SELECT' ? 'checkbox' : 'radio'}
                      name="correct-option-group"
                      checked={Boolean(opt.isCorrect)}
                      onChange={() => handleOptionCorrectToggle(idx)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                    <Input
                      value={opt.content}
                      onChange={(e) => handleOptionContentChange(idx, e.target.value)}
                      placeholder={`Lựa chọn ${String.fromCharCode(65 + idx)}...`}
                      disabled={questionType === 'TRUE_FALSE'}
                      className="text-xs flex-1"
                    />
                    {questionType !== 'TRUE_FALSE' && options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-destructive h-8 w-8 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explanation & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Giải thích chi tiết (Hiển thị sau khi thi)
              </label>
              <textarea
                rows={2}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Giải thích vì sao đáp án đúng..."
                className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60 resize-y"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Thẻ phân loại (Tags, phân cách bằng dấu phẩy)
              </label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Toán, Đại số, Chương 1..."
                className="text-xs"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button variant="secondary" onClick={onClose} disabled={createMutation.isPending || updateMutation.isPending}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!validation.isValid || createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? 'Đang lưu...' : question ? 'Cập nhật câu hỏi' : 'Lưu câu hỏi'}
          </Button>
        </div>
      </div>
    </div>
  );
}
