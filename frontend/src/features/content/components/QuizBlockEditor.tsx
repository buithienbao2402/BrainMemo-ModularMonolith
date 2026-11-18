import { useState } from 'react';
import {
  ListChecks,
  Clock,
  Award,
  Repeat,
  Shuffle,
  Eye,
  Lock,
  Plus,
  Trash2,
  Users,
  Settings,
  HelpCircle,
  Dice5,
} from 'lucide-react';
import { Input, Button } from '@/shared/ui';
import type { QuizConfig } from '../api/contentApi';
import {
  useQuizExceptionsQuery,
  useUpsertQuizExceptionMutation,
  useDeleteQuizExceptionMutation,
  useQuestionsQuery,
} from '../api/contentApi';

interface QuizBlockEditorProps {
  courseId?: string;
  blockId?: string;
  title?: string | null;
  quizConfig?: QuizConfig | null;
  onUpdate: (updates: { title?: string | null; quizConfig?: QuizConfig }) => void;
}

export function QuizBlockEditor({
  courseId = 'default-course-id',
  blockId = 'default-quiz-block',
  title,
  quizConfig,
  onUpdate,
}: QuizBlockEditorProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'questions' | 'exceptions'>('info');

  const currentConfig: QuizConfig = quizConfig || {
    timeLimitMinutes: 45,
    passScore: 70,
    maxAttempts: 3,
    resultDisplay: 'AFTER_SUBMIT',
    shuffleQuestions: true,
    shuffleOptions: true,
    questions: [],
    randomRules: [],
  };

  // Exceptions query and mutations
  const { data: exceptions = [] } = useQuizExceptionsQuery(courseId, blockId);
  const upsertExceptionMutation = useUpsertQuizExceptionMutation(courseId, blockId);
  const deleteExceptionMutation = useDeleteQuizExceptionMutation(courseId, blockId);

  // Available questions in course bank
  const { data: bankData } = useQuestionsQuery(courseId);
  const bankQuestions = bankData?.items ?? [];

  // Local exception form state
  const [newExceptionUserId, setNewExceptionUserId] = useState('');
  const [newExtraMinutes, setNewExtraMinutes] = useState<number>(15);
  const [newExtraAttempts, setNewExtraAttempts] = useState<number>(1);
  const [newExtendedCloseAt, setNewExtendedCloseAt] = useState<string>('');

  const handleConfigChange = <K extends keyof QuizConfig>(
    field: K,
    val: QuizConfig[K]
  ) => {
    onUpdate({
      title,
      quizConfig: {
        ...currentConfig,
        [field]: val,
      },
    });
  };

  // Manual Question items handling
  const handleAddQuestionToQuiz = (questionId: string) => {
    const existing = currentConfig.questions || [];
    if (existing.some((q) => q.questionId === questionId)) return;

    const matched = bankQuestions.find((q) => q.id === questionId);
    const newItems = [
      ...existing,
      {
        questionId,
        position: existing.length + 1,
        points: matched?.defaultPoints ?? 10,
      },
    ];
    handleConfigChange('questions', newItems);
  };

  const handleRemoveQuestionFromQuiz = (questionId: string) => {
    const existing = currentConfig.questions || [];
    const updated = existing
      .filter((q) => q.questionId !== questionId)
      .map((q, i) => ({ ...q, position: i + 1 }));
    handleConfigChange('questions', updated);
  };

  const handleUpdateQuestionPoints = (questionId: string, points: number) => {
    const existing = currentConfig.questions || [];
    const updated = existing.map((q) =>
      q.questionId === questionId ? { ...q, points } : q
    );
    handleConfigChange('questions', updated);
  };

  // Random Rules handling
  const handleAddRandomRule = () => {
    const existing = currentConfig.randomRules || [];
    const updated = [
      ...existing,
      {
        position: existing.length + 1,
        pickCount: 5,
        pointsEach: 10,
        filterDifficultyCode: 1,
      },
    ];
    handleConfigChange('randomRules', updated);
  };

  const handleRemoveRandomRule = (index: number) => {
    const existing = currentConfig.randomRules || [];
    const updated = existing.filter((_, i) => i !== index);
    handleConfigChange('randomRules', updated);
  };

  const handleAddException = async () => {
    if (!newExceptionUserId.trim()) return;
    await upsertExceptionMutation.mutateAsync({
      userId: newExceptionUserId.trim(),
      extraMinutes: newExtraMinutes || null,
      extraAttempts: newExtraAttempts || null,
      extendedCloseAt: newExtendedCloseAt || null,
    });
    setNewExceptionUserId('');
  };

  const handleDeleteException = async (userId: string) => {
    await deleteExceptionMutation.mutateAsync(userId);
  };

  // Summary calculations
  const totalManualQuestions = currentConfig.questions?.length ?? 0;
  const totalManualScore =
    currentConfig.questions?.reduce((sum, q) => sum + (q.points || 0), 0) ?? 0;
  const totalRandomQuestions =
    currentConfig.randomRules?.reduce((sum, r) => sum + (r.pickCount || 0), 0) ?? 0;
  const totalRandomScore =
    currentConfig.randomRules?.reduce(
      (sum, r) => sum + (r.pickCount || 0) * (r.pointsEach || 0),
      0
    ) ?? 0;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <ListChecks className="h-5 w-5 text-primary" />
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Cấu hình bài kiểm tra (Quiz Authoring - SCR-CNT-06)
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Thiết lập thông số, ngân hàng câu hỏi đề thi và ngoại lệ học viên
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-muted p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'info'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            Thông tin
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'questions'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Câu hỏi ({totalManualQuestions + totalRandomQuestions})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('exceptions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'exceptions'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Ngoại lệ ({exceptions.length})
          </button>
        </div>
      </div>

      {/* Title (Always visible) */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">
          Tiêu đề bài kiểm tra
        </label>
        <Input
          value={title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Ví dụ: Bài kiểm tra trắc nghiệm giữa kỳ..."
          className="text-sm"
        />
      </div>

      {/* ========================================== */}
      {/* TAB 1: THÔNG TIN CẤU HÌNH                   */}
      {/* ========================================== */}
      {activeTab === 'info' && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Time Limit */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Thời gian làm bài (phút)
              </label>
              <Input
                type="number"
                min={0}
                max={360}
                value={currentConfig.timeLimitMinutes ?? ''}
                onChange={(e) =>
                  handleConfigChange(
                    'timeLimitMinutes',
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                placeholder="Để trống = Không giới hạn"
                className="text-xs"
              />
            </div>

            {/* Pass Score */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                <Award className="h-3.5 w-3.5 text-muted-foreground" />
                Điểm đạt yêu cầu (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={currentConfig.passScore ?? 70}
                onChange={(e) =>
                  handleConfigChange('passScore', Number(e.target.value) || 0)
                }
                className="text-xs"
              />
            </div>

            {/* Max Attempts */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
                Số lượt làm tối đa
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={currentConfig.maxAttempts ?? ''}
                onChange={(e) =>
                  handleConfigChange(
                    'maxAttempts',
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                placeholder="Để trống = Vô hạn"
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Result Display Mode */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                Thời điểm hiển thị kết quả
              </label>
              <select
                value={currentConfig.resultDisplay || 'AFTER_SUBMIT'}
                onChange={(e) =>
                  handleConfigChange(
                    'resultDisplay',
                    e.target.value as
                      | 'AFTER_EACH_ANSWER'
                      | 'AFTER_SUBMIT'
                      | 'AFTER_CLOSE'
                      | 'AFTER_GRADING'
                  )
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="AFTER_SUBMIT">Ngay sau khi nộp bài</option>
                <option value="AFTER_EACH_ANSWER">Sau mỗi câu trả lời</option>
                <option value="AFTER_CLOSE">Sau khi hết hạn làm bài</option>
                <option value="AFTER_GRADING">Sau khi giảng viên chấm xong</option>
              </select>
            </div>

            {/* Quiz Password */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                Mật khẩu bài thi (Tùy chọn)
              </label>
              <Input
                type="password"
                value={currentConfig.password || ''}
                onChange={(e) =>
                  handleConfigChange('password', e.target.value || null)
                }
                placeholder="Để trống nếu không đặt mật khẩu"
                className="text-xs"
              />
            </div>
          </div>

          {/* Shuffling Options */}
          <div className="flex flex-wrap gap-6 pt-1">
            <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(currentConfig.shuffleQuestions)}
                onChange={(e) =>
                  handleConfigChange('shuffleQuestions', e.target.checked)
                }
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <Shuffle className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Xáo trộn thứ tự câu hỏi khi làm bài</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(currentConfig.shuffleOptions)}
                onChange={(e) =>
                  handleConfigChange('shuffleOptions', e.target.checked)
                }
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <Shuffle className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Xáo trộn thứ tự các đáp án trong câu hỏi</span>
            </label>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: CÂU HỎI & QUY TẮC BỐC ĐỀ             */}
      {/* ========================================== */}
      {activeTab === 'questions' && (
        <div className="space-y-5 pt-1">
          {/* Summary Box */}
          <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-lg text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-muted-foreground block">Tổng số câu hỏi:</span>
                <span className="text-sm font-bold text-foreground">
                  {totalManualQuestions + totalRandomQuestions} câu
                </span>
              </div>
              <div className="border-l border-border pl-4">
                <span className="text-muted-foreground block">Tổng điểm tối đa:</span>
                <span className="text-sm font-bold text-primary">
                  {totalManualScore + totalRandomScore} điểm
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddRandomRule}
                className="text-xs h-8"
              >
                <Dice5 className="h-3.5 w-3.5 mr-1" /> Thêm quy tắc bốc ngẫu nhiên
              </Button>
            </div>
          </div>

          {/* 1. Manual Questions List */}
          <div className="space-y-3">
            <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Câu hỏi chỉ định thủ công ({totalManualQuestions})</span>
              <span className="text-muted-foreground font-normal lowercase">
                Chọn từ ngân hàng câu hỏi
              </span>
            </h5>

            {/* Quick selector from bank */}
            <div className="flex gap-2">
              <select
                id="bank-picker-select"
                className="h-9 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Chọn câu hỏi từ ngân hàng để thêm vào bài thi --</option>
                {bankQuestions
                  .filter((bq) => !currentConfig.questions?.some((q) => q.questionId === bq.id))
                  .map((bq) => (
                    <option key={bq.id} value={bq.id}>
                      [{bq.questionType}] {bq.stem.substring(0, 70)}... ({bq.defaultPoints}đ)
                    </option>
                  ))}
              </select>
              <Button
                variant="secondary"
                size="sm"
                className="text-xs h-9"
                onClick={() => {
                  const sel = document.getElementById('bank-picker-select') as HTMLSelectElement;
                  if (sel?.value) {
                    handleAddQuestionToQuiz(sel.value);
                    sel.value = '';
                  }
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Thêm vào đề
              </Button>
            </div>

            {currentConfig.questions && currentConfig.questions.length > 0 ? (
              <div className="space-y-2 border border-border rounded-lg divide-y divide-border overflow-hidden">
                {currentConfig.questions.map((q, idx) => {
                  const qId = q.questionId || '';
                  const details = bankQuestions.find((bq) => bq.id === qId);
                  return (
                    <div
                      key={qId || idx}
                      className="p-3 bg-background flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-bold text-muted-foreground w-6 text-center">
                          {idx + 1}.
                        </span>
                        <div className="truncate">
                          <span className="font-medium text-foreground">
                            {details?.stem || `Câu hỏi ${qId.substring(0, 8)}...`}
                          </span>
                          {details && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {details.questionType}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground text-[11px]">Điểm:</span>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={q.points}
                            onChange={(e) =>
                              handleUpdateQuestionPoints(
                                qId,
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-16 h-8 text-xs text-center"
                          />
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveQuestionFromQuiz(qId)}
                          className="text-destructive h-8 w-8 p-0"
                          title="Xóa câu hỏi khỏi đề"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                Chưa có câu hỏi thủ công nào được chọn.
              </div>
            )}
          </div>

          {/* 2. Random Rules List */}
          <div className="space-y-3 pt-2">
            <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Quy tắc bốc ngẫu nhiên ({currentConfig.randomRules?.length ?? 0})</span>
              <span className="text-muted-foreground font-normal lowercase">
                Tự động sinh đề riêng biệt cho mỗi học viên
              </span>
            </h5>

            {currentConfig.randomRules && currentConfig.randomRules.length > 0 ? (
              <div className="space-y-2">
                {currentConfig.randomRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-background border border-border rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <Dice5 className="h-4 w-4 text-primary" />
                      <div className="flex items-center gap-2">
                        <span>Lấy ngẫu nhiên</span>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={rule.pickCount}
                          onChange={(e) => {
                            const updated = [...(currentConfig.randomRules || [])];
                            updated[idx] = { ...updated[idx], pickCount: Number(e.target.value) || 1 };
                            handleConfigChange('randomRules', updated);
                          }}
                          className="w-16 h-8 text-xs text-center"
                        />
                        <span>câu, điểm mỗi câu:</span>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={rule.pointsEach}
                          onChange={(e) => {
                            const updated = [...(currentConfig.randomRules || [])];
                            updated[idx] = { ...updated[idx], pointsEach: Number(e.target.value) || 1 };
                            handleConfigChange('randomRules', updated);
                          }}
                          className="w-16 h-8 text-xs text-center"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={rule.filterDifficultyCode ?? ''}
                        onChange={(e) => {
                          const updated = [...(currentConfig.randomRules || [])];
                          updated[idx] = {
                            ...updated[idx],
                            filterDifficultyCode: e.target.value ? Number(e.target.value) : undefined,
                          };
                          handleConfigChange('randomRules', updated);
                        }}
                        className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
                      >
                        <option value="">Bất kỳ độ khó</option>
                        <option value="1">Dễ</option>
                        <option value="2">Trung bình</option>
                        <option value="3">Khó</option>
                      </select>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRandomRule(idx)}
                        className="text-destructive h-8 w-8 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                Chưa thiết lập quy tắc bốc ngẫu nhiên nào.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 3: NGOẠI LỆ HỌC VIÊN (SCR-CNT-09)        */}
      {/* ========================================== */}
      {activeTab === 'exceptions' && (
        <div className="space-y-5 pt-1">
          {/* Add Exception Form */}
          <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-3 text-xs">
            <h5 className="font-semibold text-foreground flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-primary" />
              Thêm ngoại lệ cho học viên đặc biệt (SCR-CNT-09)
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Mã hoặc Email học viên
                </label>
                <Input
                  value={newExceptionUserId}
                  onChange={(e) => setNewExceptionUserId(e.target.value)}
                  placeholder="ID hoặc Email học viên..."
                  className="text-xs h-8"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Cộng thêm thời gian (phút)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={newExtraMinutes}
                  onChange={(e) => setNewExtraMinutes(Number(e.target.value) || 0)}
                  placeholder="+15, +30..."
                  className="text-xs h-8"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Thêm số lượt làm bài
                </label>
                <Input
                  type="number"
                  min={0}
                  max={5}
                  value={newExtraAttempts}
                  onChange={(e) => setNewExtraAttempts(Number(e.target.value) || 0)}
                  placeholder="+1, +2..."
                  className="text-xs h-8"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Gia hạn nộp bài (Tùy chọn)
                </label>
                <Input
                  type="datetime-local"
                  value={newExtendedCloseAt}
                  onChange={(e) => setNewExtendedCloseAt(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddException}
                disabled={!newExceptionUserId.trim() || upsertExceptionMutation.isPending}
                className="text-xs"
              >
                {upsertExceptionMutation.isPending ? 'Đang cấp ngoại lệ...' : 'Cấp ngoại lệ'}
              </Button>
            </div>
          </div>

          {/* Exceptions List Table */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Danh sách ngoại lệ đã cấp ({exceptions.length})
            </h5>

            {exceptions.length > 0 ? (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border font-semibold text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3">Học viên</th>
                      <th className="py-2.5 px-3 text-center">Thời gian cộng thêm</th>
                      <th className="py-2.5 px-3 text-center">Lượt thi thêm</th>
                      <th className="py-2.5 px-3">Hạn chót gia hạn</th>
                      <th className="py-2.5 px-3 text-right">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {exceptions.map((ex) => (
                      <tr key={ex.userId} className="hover:bg-muted/10">
                        <td className="py-2.5 px-3 font-medium text-foreground">
                          {ex.userFullName || ex.userEmail || ex.userId}
                        </td>
                        <td className="py-2.5 px-3 text-center text-primary font-semibold">
                          {ex.extraMinutes ? `+${ex.extraMinutes} phút` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold">
                          {ex.extraAttempts ? `+${ex.extraAttempts} lượt` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {ex.extendedCloseAt
                            ? new Date(ex.extendedCloseAt).toLocaleString('vi-VN')
                            : 'Theo lịch chung'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteException(ex.userId)}
                            className="text-destructive h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                Chưa có học viên nào được cấp ngoại lệ cho bài thi này.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
