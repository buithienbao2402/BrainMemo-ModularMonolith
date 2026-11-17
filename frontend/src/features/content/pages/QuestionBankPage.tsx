import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  HelpCircle,
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  Layers,
  Edit2,
  CheckCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  type QuestionItemDto,
  type QuestionFilterParams,
  type QuestionStatus,
  useQuestionsQuery,
} from '../api/contentApi';
import { QuestionEditorModal } from '../components/QuestionEditorModal';
import { QuestionUsageDrawer } from '../components/QuestionUsageDrawer';
import { ImportQuestionsModal } from '../components/ImportQuestionsModal';
import { AiGenerateModal } from '@/features/ai';
import { Button, Input, EmptyState } from '@/shared/ui';

export function QuestionBankPage() {
  const { courseId = 'default-course-id' } = useParams<{ courseId: string }>();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItemDto | null>(null);

  const [isUsageOpen, setIsUsageOpen] = useState(false);
  const [usageQuestionId, setUsageQuestionId] = useState<string | null>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const filterParams: QuestionFilterParams = {
    search: search.trim() || undefined,
    type: selectedType || undefined,
    difficulty: selectedDifficulty ? Number(selectedDifficulty) : undefined,
    status: selectedStatus || undefined,
    tag: selectedTag.trim() || undefined,
  };

  const { data, isLoading, refetch } = useQuestionsQuery(courseId, filterParams);

  const questions = data?.items ?? [];

  const handleCreateNew = () => {
    setSelectedQuestion(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (q: QuestionItemDto) => {
    setSelectedQuestion(q);
    setIsEditorOpen(true);
  };

  const handleOpenUsage = (questionId: string) => {
    setUsageQuestionId(questionId);
    setIsUsageOpen(true);
  };

  const handleToggleStatus = async (q: QuestionItemDto) => {
    const nextStatus: QuestionStatus = q.status === 'READY' ? 'DRAFT' : 'READY';
    // Use dynamic mutation for the question id
    await fetch(`/api/v1/courses/${courseId}/questions/${q.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('brainmemo_access_token') || ''}`,
      },
      body: JSON.stringify({ status: nextStatus }),
    });
    // Trigger refetch
    window.location.reload();
  };

  const handleExport = () => {
    window.open(`/api/v1/courses/${courseId}/questions/export`, '_blank');
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'MULTIPLE_CHOICE':
        return 'Trắc nghiệm đơn';
      case 'MULTIPLE_SELECT':
        return 'Đa đáp án';
      case 'TRUE_FALSE':
        return 'Đúng / Sai';
      case 'FILL_BLANK':
        return 'Điền từ';
      case 'MATCHING':
        return 'Ghép cặp';
      case 'ESSAY':
        return 'Tự luận';
      default:
        return type;
    }
  };

  const getDifficultyBadge = (diff?: number | null) => {
    switch (diff) {
      case 1:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Dễ</span>;
      case 2:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">Trung bình</span>;
      case 3:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400">Khó</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground">—</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Ngân hàng câu hỏi (SCR-CNT-04)
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Quản lý kho câu hỏi trắc nghiệm, tự luận, phân loại theo độ khó và liên kết vào bài kiểm tra
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="text-xs flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" />
            Xuất Excel/CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportOpen(true)}
            className="text-xs flex items-center gap-1.5"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Nhập câu hỏi (Import)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAiModalOpen(true)}
            className="text-xs flex items-center gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/40"
          >
            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            Tạo câu hỏi với AI (SCR-AI-01)
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateNew}
            className="text-xs flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Thêm câu hỏi
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm nội dung..."
              className="pl-9 text-xs"
            />
          </div>

          {/* Question Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Tất cả loại câu hỏi</option>
            <option value="MULTIPLE_CHOICE">Trắc nghiệm đơn</option>
            <option value="MULTIPLE_SELECT">Đa đáp án</option>
            <option value="TRUE_FALSE">Đúng / Sai</option>
            <option value="FILL_BLANK">Điền từ</option>
            <option value="MATCHING">Ghép cặp</option>
            <option value="ESSAY">Tự luận</option>
          </select>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Tất cả độ khó</option>
            <option value="1">Dễ</option>
            <option value="2">Trung bình</option>
            <option value="3">Khó</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="READY">Sẵn sàng (READY)</option>
            <option value="DRAFT">Bản nháp (DRAFT)</option>
          </select>

          {/* Tag Filter */}
          <Input
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            placeholder="Lọc theo thẻ (tag)..."
            className="text-xs"
          />
        </div>
      </div>

      {/* Questions Data Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            <div className="h-12 bg-muted/40 animate-pulse rounded-lg" />
            <div className="h-12 bg-muted/40 animate-pulse rounded-lg" />
            <div className="h-12 bg-muted/40 animate-pulse rounded-lg" />
          </div>
        ) : questions.length === 0 ? (
          <div className="py-16 text-center">
            <EmptyState
              title="Không tìm thấy câu hỏi nào"
              description="Hãy thử thay đổi tiêu chí bộ lọc hoặc tạo thêm câu hỏi mới vào ngân hàng."
              action={
                <Button size="sm" onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-1.5" /> Thêm câu hỏi đầu tiên
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Nội dung câu hỏi (Stem)</th>
                  <th className="py-3 px-4 w-36">Loại câu</th>
                  <th className="py-3 px-4 w-28">Độ khó</th>
                  <th className="py-3 px-4 w-20 text-center">Điểm</th>
                  <th className="py-3 px-4 w-32 text-center">Trạng thái</th>
                  <th className="py-3 px-4 w-28 text-center">Đang dùng</th>
                  <th className="py-3 px-4 w-28 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {questions.map((q) => (
                  <tr key={q.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-foreground line-clamp-2">
                        {q.stem}
                      </div>
                      {q.tags && q.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {q.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs font-medium text-muted-foreground">
                      <span className="px-2 py-1 rounded bg-muted/60 border border-border">
                        {getTypeLabel(q.questionType)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">{getDifficultyBadge(q.difficultyCode)}</td>

                    <td className="py-3.5 px-4 text-center text-xs font-bold text-foreground">
                      {q.defaultPoints}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(q)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                          q.status === 'READY'
                            ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400'
                        }`}
                        title="Bấm để chuyển trạng thái"
                      >
                        {q.status === 'READY' ? (
                          <>
                            <CheckCircle className="h-3 w-3" /> READY
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" /> DRAFT
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenUsage(q.id)}
                        className="text-xs h-7 px-2 text-primary hover:bg-primary/10"
                      >
                        <Layers className="h-3.5 w-3.5 mr-1" />
                        {q.usageCount ?? 0}
                      </Button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(q)}
                        className="h-8 w-8 p-0"
                        title="Chỉnh sửa câu hỏi"
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <QuestionEditorModal
        courseId={courseId}
        question={selectedQuestion}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onViewUsage={(qId) => {
          setIsEditorOpen(false);
          handleOpenUsage(qId);
        }}
      />

      {/* Usage Drawer */}
      <QuestionUsageDrawer
        courseId={courseId}
        questionId={usageQuestionId}
        isOpen={isUsageOpen}
        onClose={() => setIsUsageOpen(false)}
      />

      {/* Import Modal */}
      <ImportQuestionsModal
        courseId={courseId}
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      {/* AI Generate Modal */}
      <AiGenerateModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        courseId={courseId}
        defaultTab="QUIZ"
        onSuccess={() => {
          setIsAiModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
