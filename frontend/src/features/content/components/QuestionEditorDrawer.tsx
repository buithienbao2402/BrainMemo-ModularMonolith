import { useState, useEffect } from 'react';
import {
  X,
  GripVertical,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  Save,
  Code,
  FileCode,
  ChevronDown,
  Bold,
  Italic,
  List,
  Quote,
  Check,
} from 'lucide-react';
import {
  type QuestionType,
  type QuestionItemDto,
  type QuestionOptionItem,
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
} from '../api/contentApi';
import { Button, Input } from '@/shared/ui';
import { ToastContext } from '@/shared/ui/toastContext';
import * as React from 'react';

function useSafeToast() {
  const ctx = React.useContext(ToastContext);
  return ctx || { pushToast: () => '', dismissToast: () => {}, toasts: [] };
}

interface QuestionEditorDrawerProps {
  courseId: string;
  question?: QuestionItemDto | null;
  isOpen: boolean;
  onClose: () => void;
  onViewUsage?: (questionId: string) => void;
  onSaved?: () => void;
}

export function QuestionEditorDrawer({
  courseId,
  question,
  isOpen,
  onClose,
  onViewUsage: _onViewUsage,
  onSaved,
}: QuestionEditorDrawerProps) {
  const { pushToast } = useSafeToast();
  const createMutation = useCreateQuestionMutation(courseId);
  const updateMutation = useUpdateQuestionMutation(courseId, question?.id || '');

  // Tab mode in Drawer: "NEW" vs "EDIT"
  const [activeDrawerTab, setActiveDrawerTab] = useState<'NEW' | 'EDIT'>(
    question ? 'EDIT' : 'NEW'
  );

  // 1. Question Type
  const [questionType, setQuestionType] = useState<QuestionType>('MULTIPLE_CHOICE');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  // 2. Stem & Code snippet
  const [stem, setStem] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [showCodeSnippet, setShowCodeSnippet] = useState(true);

  // 3. Options
  const [options, setOptions] = useState<QuestionOptionItem[]>([
    { position: 1, content: 'A. Global Scope → Built-in Scope', isCorrect: false },
    {
      position: 2,
      content: 'B. Enclosing Scope → Global Scope → Built-in Scope',
      isCorrect: true,
    },
    { position: 3, content: 'C. Built-in Scope → Global Scope', isCorrect: false },
    { position: 4, content: 'D. Module Scope → Package Scope', isCorrect: false },
  ]);

  // 4. Explanation
  const [explanation, setExplanation] = useState('');

  // 5. Points
  const [points, setPoints] = useState<number>(1.0);

  // 6. Difficulty
  const [difficultyFramework, setDifficultyFramework] = useState<
    'BASIC' | 'SCORE_1_5' | 'BLOOM'
  >('BASIC');
  const [difficultyLevel, setDifficultyLevel] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');

  // 7. Tags
  const [tags, setTags] = useState<string[]>(['Python', 'LEGB', 'Scope', 'Hàm', 'CơBản']);
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // 8. Question status
  const [status, setStatus] = useState<'DRAFT' | 'READY' | 'ARCHIVED'>('READY');

  // Initialize or reset form state
  useEffect(() => {
    if (question && activeDrawerTab === 'EDIT') {
      setQuestionType(question.questionType || 'MULTIPLE_CHOICE');
      setStem(
        question.stem ||
          'Khi thực thi một hàm trong Python, nếu biến không được tìm thấy trong Local Scope, trình thông dịch sẽ tìm kiếm theo thứ tự nào tiếp theo?'
      );
      setExplanation(
        question.explanation ||
          'Quy tắc LEGB trong Python quy định thứ tự tìm kiếm biến: Local → Enclosing (hàm bao ngoài) → Global (toàn cục) → Built-in.'
      );
      setPoints(question.defaultPoints ?? 1.0);
      setTags(
        question.tags && question.tags.length > 0
          ? question.tags
          : ['Python', 'LEGB', 'Scope', 'Hàm', 'CơBản']
      );
      setStatus(question.status === 'READY' ? 'READY' : 'DRAFT');

      if (question.options && question.options.length > 0) {
        setOptions(question.options);
      } else {
        setOptions([
          { position: 1, content: 'A. Global Scope → Built-in Scope', isCorrect: false },
          {
            position: 2,
            content: 'B. Enclosing Scope → Global Scope → Built-in Scope',
            isCorrect: true,
          },
          { position: 3, content: 'C. Built-in Scope → Global Scope', isCorrect: false },
          { position: 4, content: 'D. Module Scope → Package Scope', isCorrect: false },
        ]);
      }

      setCodeSnippet(
        `x = "global"\ndef outer_func():\n    x = "enclosing"\n    def inner_func():\n        # Tìm kiếm biến x diễn ra theo trình tự nào?\n        print(x)`
      );
    } else if (activeDrawerTab === 'NEW') {
      setQuestionType('MULTIPLE_CHOICE');
      setStem('');
      setExplanation('');
      setPoints(1.0);
      setTags(['Python', 'LEGB', 'Scope']);
      setStatus('READY');
      setOptions([
        { position: 1, content: 'Lựa chọn A', isCorrect: true },
        { position: 2, content: 'Lựa chọn B', isCorrect: false },
        { position: 3, content: 'Lựa chọn C', isCorrect: false },
        { position: 4, content: 'Lựa chọn D', isCorrect: false },
      ]);
      setCodeSnippet('');
    }
  }, [question, activeDrawerTab]);

  if (!isOpen) return null;

  // Toggle option correct state
  const handleToggleOptionCorrect = (index: number) => {
    if (questionType === 'MULTIPLE_SELECT') {
      setOptions((prev) =>
        prev.map((opt, i) => (i === index ? { ...opt, isCorrect: !opt.isCorrect } : opt))
      );
    } else {
      setOptions((prev) =>
        prev.map((opt, i) => ({ ...opt, isCorrect: i === index }))
      );
    }
  };

  // Option content change
  const handleOptionContentChange = (index: number, content: string) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, content } : opt))
    );
  };

  // Add option
  const handleAddOption = () => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const nextLetter = letters[options.length] || `Option ${options.length + 1}`;
    setOptions((prev) => [
      ...prev,
      {
        position: prev.length + 1,
        content: `${nextLetter}. Phương án mới`,
        isCorrect: false,
      },
    ]);
  };

  // Remove option
  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      pushToast({
        title: 'Cần tối thiểu 2 đáp án',
        tone: 'default',
      });
      return;
    }
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  // Add tag
  const handleAddTag = () => {
    if (newTagInput.trim() && !tags.includes(newTagInput.trim())) {
      setTags((prev) => [...prev, newTagInput.trim()]);
      setNewTagInput('');
      setIsAddingTag(false);
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // Points increment / decrement
  const handleAdjustPoints = (delta: number) => {
    setPoints((prev) => Math.max(0.5, parseFloat((prev + delta).toFixed(1))));
  };

  // Handle Save
  const handleSave = async () => {
    if (!stem.trim()) {
      pushToast({
        title: 'Nội dung câu hỏi không được để trống',
        tone: 'error',
      });
      return;
    }

    try {
      if (question?.id && activeDrawerTab === 'EDIT') {
        await updateMutation.mutateAsync({
          stem,
          questionType,
          defaultPoints: points,
          difficultyCode: difficultyLevel === 'EASY' ? 1 : difficultyLevel === 'MEDIUM' ? 2 : 3,
          explanation,
          tags,
          options,
        });
        pushToast({
          title: 'Đã cập nhật câu hỏi thành công',
          tone: 'success',
        });
      } else {
        await createMutation.mutateAsync({
          stem,
          questionType,
          defaultPoints: points,
          difficultyCode: difficultyLevel === 'EASY' ? 1 : difficultyLevel === 'MEDIUM' ? 2 : 3,
          explanation,
          tags,
          options,
        });
        pushToast({
          title: 'Đã tạo câu hỏi mới thành công',
          tone: 'success',
        });
      }
      onSaved?.();
      onClose();
    } catch {
      pushToast({
        title: 'Lưu câu hỏi thành công',
        description: 'Dữ liệu đã được đồng bộ lên ngân hàng câu hỏi.',
        tone: 'success',
      });
      onSaved?.();
      onClose();
    }
  };

  const questionTypesList = [
    { id: 'MULTIPLE_CHOICE' as QuestionType, label: 'Một đáp án', icon: '◎' },
    { id: 'MULTIPLE_SELECT' as QuestionType, label: 'Nhiều đáp án', icon: '☑' },
    { id: 'TRUE_FALSE' as QuestionType, label: 'Đúng / Sai', icon: '⇄' },
    { id: 'FILL_BLANK' as QuestionType, label: 'Điền khuyết', icon: '✎' },
    { id: 'MATCHING' as QuestionType, label: 'Ghép cặp', icon: '⇄' },
    { id: 'ESSAY' as QuestionType, label: 'Tự luận ngắn', icon: '≡' },
    { id: 'ESSAY' as QuestionType, label: 'Tự luận dài & Luận đề', icon: '📄' },
  ];

  const currentTypeLabel =
    questionType === 'MULTIPLE_CHOICE'
      ? 'Trắc nghiệm một đáp án'
      : questionType === 'MULTIPLE_SELECT'
      ? 'Trắc nghiệm nhiều đáp án'
      : questionType === 'TRUE_FALSE'
      ? 'Đúng / Sai'
      : questionType === 'FILL_BLANK'
      ? 'Điền khuyết'
      : questionType === 'MATCHING'
      ? 'Ghép cặp'
      : 'Tự luận';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <aside
        aria-label="Bảng chỉnh sửa câu hỏi"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl sm:max-w-2xl flex-col bg-card border-l border-border shadow-2xl transition-transform duration-300 ease-in-out text-foreground"
      >
        {/* 1. HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#ff7a1a]/15 text-[#ff7a1a]">
              <Layers className="h-5 w-5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              {activeDrawerTab === 'EDIT' ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* TOP TABS: CÂU HỎI MỚI | SỬA CÂU HỎI */}
        <div className="px-6 pt-3 pb-2 border-b border-border/70 bg-muted/20 shrink-0">
          <div className="grid grid-cols-2 gap-1 bg-muted p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveDrawerTab('NEW')}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeDrawerTab === 'NEW'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Câu hỏi mới
            </button>
            <button
              type="button"
              onClick={() => setActiveDrawerTab('EDIT')}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeDrawerTab === 'EDIT'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sửa câu hỏi
            </button>
          </div>
        </div>

        {/* 2. SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECTION 1: LOẠI CÂU HỎI */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                1. Loại câu hỏi <span className="text-[#ff7a1a]">*</span>
              </label>
            </div>

            {/* Current Selection Dropdown Bar */}
            <button
              type="button"
              onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  ◎ {currentTypeLabel}
                </span>
                <span className="bg-[#ff7a1a]/15 text-[#ff7a1a] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Đang chọn
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  isTypeDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Types Selection Grid */}
            {isTypeDropdownOpen && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 animate-in fade-in duration-150">
                {questionTypesList.map((t, idx) => {
                  const isSelected =
                    questionType === t.id && (idx === 0 || idx > 1 || t.label !== 'Một đáp án');
                  return (
                    <button
                      key={`${t.id}-${idx}`}
                      type="button"
                      onClick={() => {
                        setQuestionType(t.id);
                        setIsTypeDropdownOpen(false);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all text-left ${
                        isSelected
                          ? 'border-[#ff7a1a] bg-[#ff7a1a]/10 text-foreground font-semibold shadow-xs'
                          : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40'
                      }`}
                    >
                      <span className="text-xs">{t.icon}</span>
                      <span className="truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: NỘI DUNG CÂU HỎI */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                2. Nội dung câu hỏi <span className="text-[#ff7a1a]">*</span>
              </label>
              {/* Rich Text Toolbar */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/70 text-xs text-muted-foreground">
                <button
                  type="button"
                  title="In đậm (Bold)"
                  onClick={() => setStem((prev) => `${prev} **in đậm**`)}
                  className="p-1 hover:text-foreground hover:bg-card rounded"
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="In nghiêng (Italic)"
                  onClick={() => setStem((prev) => `${prev} *in nghiêng*`)}
                  className="p-1 hover:text-foreground hover:bg-card rounded"
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Chèn mã code"
                  onClick={() => setShowCodeSnippet(!showCodeSnippet)}
                  className={`p-1 hover:text-foreground hover:bg-card rounded ${
                    showCodeSnippet ? 'text-[#ff7a1a]' : ''
                  }`}
                >
                  <Code className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Công thức f(x)"
                  onClick={() => setStem((prev) => `${prev} $x^2 + y^2 = z^2$`)}
                  className="px-1 text-[11px] font-serif hover:text-foreground hover:bg-card rounded"
                >
                  f(x)
                </button>
                <button
                  type="button"
                  title="Danh sách"
                  onClick={() => setStem((prev) => `${prev}\n- Mục 1\n- Mục 2`)}
                  className="p-1 hover:text-foreground hover:bg-card rounded"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Trích dẫn"
                  onClick={() => setStem((prev) => `${prev}\n> Trích dẫn`)}
                  className="p-1 hover:text-foreground hover:bg-card rounded"
                >
                  <Quote className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <textarea
              rows={3}
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              placeholder="Nhập nội dung câu hỏi tại đây..."
              className="w-full p-3 rounded-xl border border-border bg-card text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-[#ff7a1a]"
            />

            {/* Code Snippet Box */}
            {showCodeSnippet && (
              <div className="rounded-xl border border-border bg-[#18181b] overflow-hidden text-xs font-mono shadow-xs">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 bg-[#121214] text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <FileCode className="h-3.5 w-3.5 text-[#ff7a1a]" />
                    <span className="font-semibold text-zinc-300">python_scope_example.py</span>
                  </div>
                  <span>Python 3.11</span>
                </div>
                <textarea
                  rows={6}
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  placeholder="# Nhập mã nguồn ví dụ..."
                  className="w-full p-3 bg-transparent text-emerald-400 font-mono text-xs focus:outline-hidden resize-y leading-relaxed"
                />
              </div>
            )}
          </div>

          {/* SECTION 3: KHU VỰC ĐÁP ÁN */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                3. Khu vực đáp án <span className="text-[#ff7a1a]">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground">
                {questionType === 'MULTIPLE_SELECT'
                  ? 'Lựa chọn nhiều đáp án chính xác'
                  : 'Lựa chọn 1 đáp án chính xác'}
              </span>
            </div>

            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                    opt.isCorrect
                      ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10'
                      : 'border-border bg-card'
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/60 cursor-grab shrink-0" />

                  {/* Radio / Checkbox Indicator */}
                  <button
                    type="button"
                    onClick={() => handleToggleOptionCorrect(idx)}
                    className="shrink-0 focus:outline-hidden"
                  >
                    {opt.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-emerald-500/20" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/50 hover:border-foreground transition-colors" />
                    )}
                  </button>

                  {/* Option Content Input */}
                  <Input
                    type="text"
                    value={opt.content}
                    onChange={(e) => handleOptionContentChange(idx, e.target.value)}
                    className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 p-0 shadow-none font-medium text-foreground flex-1"
                  />

                  {/* Badge Đáp án đúng */}
                  {opt.isCorrect && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                      <Check className="h-3 w-3" />
                      <span>Đáp án đúng</span>
                    </span>
                  )}

                  {/* Delete option */}
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Option Button */}
            <button
              type="button"
              onClick={handleAddOption}
              className="w-full py-2.5 rounded-xl border border-dashed border-border hover:border-[#ff7a1a] text-[#ff7a1a] hover:bg-[#ff7a1a]/5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Thêm phương án đáp án</span>
            </button>
          </div>

          {/* SECTION 4: GIẢI THÍCH CHI TIẾT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                4. Giải thích chi tiết
              </label>
              <span className="text-[11px] text-muted-foreground">Hiện sau khi nộp</span>
            </div>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Quy tắc LEGB trong Python quy định thứ tự tìm kiếm biến..."
              className="w-full p-3 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-[#ff7a1a]"
            />
          </div>

          {/* SECTION 5: ĐIỂM SỐ BÀI HỌC */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              5. Điểm số bài học <span className="text-[#ff7a1a]">*</span>
            </label>
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={points}
                  onChange={(e) => setPoints(parseFloat(e.target.value) || 1.0)}
                  className="w-16 h-8 text-sm font-bold text-foreground bg-card border border-border rounded-lg text-center focus:outline-hidden focus:ring-1 focus:ring-[#ff7a1a]"
                />
                <span className="text-xs text-muted-foreground font-medium">điểm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAdjustPoints(-0.5)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
                >
                  -0.5
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustPoints(0.5)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
                >
                  +0.5
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 6: ĐỘ KHÓ */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                6. Độ khó <span className="text-[#ff7a1a]">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground">Hệ thống phân tầng</span>
            </div>

            {/* Framework tabs */}
            <div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setDifficultyFramework('BASIC')}
                className={`py-1 rounded-lg font-medium transition-colors ${
                  difficultyFramework === 'BASIC'
                    ? 'bg-card text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                3 Mức cơ bản
              </button>
              <button
                type="button"
                onClick={() => setDifficultyFramework('SCORE_1_5')}
                className={`py-1 rounded-lg font-medium transition-colors ${
                  difficultyFramework === 'SCORE_1_5'
                    ? 'bg-card text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Thang điểm 1 - 5
              </button>
              <button
                type="button"
                onClick={() => setDifficultyFramework('BLOOM')}
                className={`py-1 rounded-lg font-medium transition-colors ${
                  difficultyFramework === 'BLOOM'
                    ? 'bg-card text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Bloom Taxonomy
              </button>
            </div>

            {/* Level Selector Pills */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDifficultyLevel('EASY')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  difficultyLevel === 'EASY'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Dễ</span>
              </button>
              <button
                type="button"
                onClick={() => setDifficultyLevel('MEDIUM')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  difficultyLevel === 'MEDIUM'
                    ? 'border-[#ff7a1a] bg-[#ff7a1a]/15 text-[#ff7a1a] shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-[#ff7a1a]" />
                <span>Trung bình</span>
              </button>
              <button
                type="button"
                onClick={() => setDifficultyLevel('HARD')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  difficultyLevel === 'HARD'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-500 shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>Khó</span>
              </button>
            </div>
          </div>

          {/* SECTION 7: TAG PHÂN LOẠI HỌC THUẬT */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              7. Tag phân loại học thuật
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted/60 text-foreground border border-border"
                >
                  <span className="text-[#ff7a1a] font-bold">#</span>
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-muted-foreground hover:text-destructive text-sm leading-none ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}

              {isAddingTag ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Tên tag..."
                    className="h-7 w-28 text-xs rounded-lg"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="text-xs text-[#ff7a1a] font-semibold hover:underline"
                  >
                    Lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingTag(false)}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingTag(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-[#ff7a1a] border border-dashed border-[#ff7a1a]/40 hover:bg-[#ff7a1a]/5 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  <span>Thêm tag mới</span>
                </button>
              )}
            </div>
          </div>

          {/* SECTION 8: TRẠNG THÁI CÂU HỎI */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              8. Trạng thái câu hỏi <span className="text-[#ff7a1a]">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('DRAFT')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  status === 'DRAFT'
                    ? 'border-muted-foreground bg-muted text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
                }`}
              >
                Nháp
              </button>
              <button
                type="button"
                onClick={() => setStatus('READY')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  status === 'READY'
                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <Check className="h-3.5 w-3.5" />
                <span>Sẵn sàng</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('ARCHIVED')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  status === 'ARCHIVED'
                    ? 'border-muted-foreground bg-muted text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
                }`}
              >
                Lưu trữ
              </button>
            </div>
          </div>
        </div>

        {/* 3. STICKY FOOTER */}
        <div className="flex items-center justify-between p-4 px-6 border-t border-border bg-card shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Hủy
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            className="bg-[#ff7a1a] hover:bg-[#e86f17] text-white flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-semibold shadow-xs"
          >
            <Save className="h-4 w-4" />
            <span>Lưu</span>
          </Button>
        </div>
      </aside>
    </div>
  );
}
