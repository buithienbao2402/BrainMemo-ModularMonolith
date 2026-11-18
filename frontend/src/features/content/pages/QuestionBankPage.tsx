import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  Edit2,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  FilterX,
  AlertTriangle,
  Info,
  Trash2,
  Copy,
  MoreVertical,
  Archive,
  Tag,
  BookOpen,
  GraduationCap,
  RotateCcw,
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

// Mock list of courses for the course dropdown according to design
interface CourseOption {
  id: string;
  name: string;
  scope: 'Public' | 'Private' | 'Tổ chức nội bộ';
  questionCount: number;
}

const COURSES_LIST: CourseOption[] = [
  { id: 'crs-py-01', name: 'Python cơ bản', scope: 'Public', questionCount: 125 },
  { id: 'crs-ds-02', name: 'Cấu trúc dữ liệu & Giải thuật', scope: 'Public', questionCount: 94 },
  { id: 'crs-web-03', name: 'Lập trình Web Django & FastAPI', scope: 'Private', questionCount: 68 },
  { id: 'crs-ml-04', name: 'Học máy & Xử lý dữ liệu Pandas', scope: 'Tổ chức nội bộ', questionCount: 42 },
];

// Rich fallback sample questions matching the exact screenshot
const DESIGN_SAMPLE_QUESTIONS = [
  {
    id: 'sample-q-1',
    stem: 'Quy tắc tìm kiếm biến LEGB trong Python tuân theo thứ tự ưu tiên nào sau đây?',
    codeSnippet: 'Local ->\nEnclosing ->\nGlobal ->\nBuilt-in',
    questionType: 'MULTIPLE_CHOICE',
    typeLabel: 'Trắc nghiệm',
    tags: ['python', 'scope'],
    difficulty: 'Trung bình',
    difficultyColor: 'text-amber-400',
    points: 1.0,
    status: 'READY' as QuestionStatus,
    statusBadge: 'READY',
    usageText: '4 đề thi',
    usageCount: 4,
  },
  {
    id: 'sample-q-2',
    stem: 'Trong hàm lồng nhau (Nested functions), từ khóa nonlocal được dùng để thay đổi giá trị của biến ở phạm vi nào?',
    codeSnippet: 'nonlocal x\nx = 100',
    questionType: 'FILL_BLANK',
    typeLabel: 'Điền khuyết',
    tags: ['scope', 'nested'],
    difficulty: 'Khó',
    difficultyColor: 'text-rose-400',
    points: 2.0,
    status: 'READY' as QuestionStatus,
    statusBadge: 'READY',
    usageText: '2 đề thi',
    usageCount: 2,
  },
  {
    id: 'sample-q-3',
    stem: 'Mô tả cơ chế hoạt động của Garbage Collection (Thu gom rác) dựa trên Reference Counting và Cyclic GC trong CPython?',
    codeSnippet: 'gc.collect()',
    questionType: 'ESSAY',
    typeLabel: 'Tự luận',
    tags: ['memory', 'gc'],
    difficulty: 'Khó',
    difficultyColor: 'text-rose-400',
    points: 3.0,
    status: 'DRAFT' as QuestionStatus,
    statusBadge: 'DRAFT_AI',
    usageText: '—',
    usageCount: 0,
  },
  {
    id: 'sample-q-4',
    stem: 'Mệnh đề finally trong khối lệnh try-except-finally luôn luôn được thực thi trong mọi trường hợp, kể cả khi có return?',
    codeSnippet: 'try: ...\nfinally: ...',
    questionType: 'TRUE_FALSE',
    typeLabel: 'Đúng / Sai',
    tags: ['exception'],
    difficulty: 'Dễ',
    difficultyColor: 'text-emerald-400',
    points: 0.5,
    status: 'DRAFT' as QuestionStatus,
    statusBadge: 'DRAFT',
    usageText: '—',
    usageCount: 0,
  },
  {
    id: 'sample-q-5',
    stem: 'Khai báo hàm decorator trong Python nhận vào một tham số hàm f và trả về một hàm bao đóng wrapper?',
    codeSnippet: '@my_decorator',
    questionType: 'MULTIPLE_CHOICE',
    typeLabel: 'Trắc nghiệm',
    tags: ['decorator'],
    difficulty: 'Trung bình',
    difficultyColor: 'text-amber-400',
    points: 1.5,
    status: 'ARCHIVED' as unknown as QuestionStatus,
    statusBadge: 'ARCHIVED',
    usageText: '—',
    usageCount: 0,
  },
];

export function QuestionBankPage() {
  const { courseId = 'crs-py-01' } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Course Selector state
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<CourseOption>(
    COURSES_LIST.find((c) => c.id === courseId) || COURSES_LIST[0]!
  );

  // Checkbox selection state (default all 5 checked matching screenshot)
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([
    'sample-q-1',
    'sample-q-2',
    'sample-q-3',
    'sample-q-4',
    'sample-q-5',
  ]);

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItemDto | null>(null);

  const [isUsageOpen, setIsUsageOpen] = useState(false);
  const [usageQuestionId, setUsageQuestionId] = useState<string | null>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Data fetching
  const filterParams: QuestionFilterParams = {
    search: search.trim() || undefined,
    type: selectedType || undefined,
    difficulty: selectedDifficulty ? Number(selectedDifficulty) : undefined,
    status: selectedStatus || undefined,
    tag: selectedTag.trim() || undefined,
  };

  const { data, refetch } = useQuestionsQuery(courseId, filterParams);
  const apiQuestions = data?.items ?? [];

  // Handlers
  const handleSelectCourse = (course: CourseOption) => {
    setSelectedCourse(course);
    setIsCourseDropdownOpen(false);
    navigate(`/courses/${course.id}/manage/questions`);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedTag('');
    setSelectedDifficulty('');
    setSelectedType('');
    setSelectedStatus('');
  };

  const handleCreateNew = () => {
    setSelectedQuestion(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (qItem: { id: string; stem: string }) => {
    const existing = apiQuestions.find((q) => q.id === qItem.id);
    if (existing) {
      setSelectedQuestion(existing);
    } else {
      setSelectedQuestion({
        id: qItem.id,
        courseId,
        stem: qItem.stem,
        questionType: 'MULTIPLE_CHOICE',
        status: 'READY',
        origin: 'ORIGINAL',
        defaultPoints: 1,
        options: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setIsEditorOpen(true);
  };

  const handleOpenUsage = (questionId: string) => {
    setUsageQuestionId(questionId);
    setIsUsageOpen(true);
  };

  const handleExport = () => {
    window.open(`/api/v1/courses/${courseId}/questions/export`, '_blank');
  };

  const handleToggleSelectAll = () => {
    if (selectedQuestionIds.length === DESIGN_SAMPLE_QUESTIONS.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(DESIGN_SAMPLE_QUESTIONS.map((q) => q.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredCourses = COURSES_LIST.filter((c) =>
    c.name.toLowerCase().includes(courseSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0e0e12] text-foreground pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Ngân hàng câu hỏi
            </h1>
            <span className="sr-only">Ngân hàng câu hỏi (SCR-CNT-04)</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#2a2a38] bg-[#161620] px-4 py-2 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white hover:bg-[#1f1f2c] transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Nhập Excel/CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-lg border border-[#2a2a38] bg-[#161620] px-4 py-2 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white hover:bg-[#1f1f2c] transition-colors"
            >
              <Download className="h-4 w-4 text-zinc-300" />
              <span>Xuất</span>
            </button>

            <button
              type="button"
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#ea6d10] active:bg-[#d8620c] transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm câu hỏi</span>
            </button>
          </div>
        </div>

        {/* Course Selector Dropdown Card */}
        <div className="space-y-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCourseDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between rounded-xl border border-[#2a2a38] bg-[#161620] p-4 text-left transition-colors hover:border-[#3b3b4f]"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-base">
                      {selectedCourse.name}
                    </span>
                    <span className="rounded bg-emerald-950/80 border border-emerald-700/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                      {selectedCourse.scope}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {selectedCourse.questionCount} câu hỏi
                  </p>
                </div>
              </div>
              <div className="text-zinc-400">
                {isCourseDropdownOpen ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </button>

            {/* Dropdown Menu */}
            {isCourseDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-30 mt-2 rounded-xl border border-[#2d2d3e] bg-[#1a1a26] p-3 shadow-2xl backdrop-blur-xl space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    placeholder="Tìm khóa học..."
                    className="w-full rounded-lg border border-[#2d2d3e] bg-[#12121c] pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-orange"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1 pt-1">
                  {filteredCourses.map((c) => {
                    const isCurrent = c.id === selectedCourse.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCourse(c)}
                        className={`w-full flex items-center justify-between rounded-lg p-2.5 text-left text-xs transition-colors ${
                          isCurrent
                            ? 'bg-[#252536] text-white'
                            : 'text-zinc-300 hover:bg-[#20202e] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <BookOpen className="h-4 w-4 text-amber-500 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{c.name}</span>
                              <span className="text-[10px] rounded px-1.5 py-0.2 bg-zinc-800 text-zinc-400 border border-zinc-700">
                                {c.scope}
                              </span>
                            </div>
                            <span className="text-zinc-400 text-[11px]">
                              {c.questionCount} câu hỏi
                            </span>
                          </div>
                        </div>
                        {isCurrent && <Check className="h-4 w-4 text-brand-orange shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats Line */}
          <div className="flex items-center gap-4 text-xs font-medium text-zinc-400 pl-1">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              <strong className="text-zinc-200">95</strong> sẵn sàng
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
              <strong className="text-zinc-200">25</strong> nháp
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
              <strong className="text-zinc-200">5</strong> lưu trữ
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="rounded-xl border border-[#262635] bg-[#14141c] p-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm câu hỏi theo đề mục..."
              className="w-full rounded-lg border border-[#2a2a38] bg-[#1a1a24] pl-10 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-orange"
            />
          </div>

          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="rounded-lg border border-[#2a2a38] bg-[#1a1a24] px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-brand-orange"
          >
            <option value="">Tag: Tất cả</option>
            <option value="python">python</option>
            <option value="scope">scope</option>
            <option value="memory">memory</option>
            <option value="nested">nested</option>
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="rounded-lg border border-[#2a2a38] bg-[#1a1a24] px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-brand-orange"
          >
            <option value="">Độ khó: Tất cả</option>
            <option value="1">Dễ</option>
            <option value="2">Trung bình</option>
            <option value="3">Khó</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-[#2a2a38] bg-[#1a1a24] px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-brand-orange"
          >
            <option value="">Loại câu hỏi: Tất cả</option>
            <option value="MULTIPLE_CHOICE">Trắc nghiệm</option>
            <option value="FILL_BLANK">Điền khuyết</option>
            <option value="TRUE_FALSE">Đúng / Sai</option>
            <option value="ESSAY">Tự luận</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-[#2a2a38] bg-[#1a1a24] px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-brand-orange"
          >
            <option value="">Trạng thái: Tất cả</option>
            <option value="READY">Sẵn sàng</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="ARCHIVED">Lưu trữ</option>
          </select>

          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-2 py-1.5 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Xóa bộ lọc</span>
          </button>
        </div>

        {/* Questions Data Table */}
        <div className="relative rounded-xl border border-[#262635] bg-[#14141c] overflow-hidden shadow-xl">
          
          {/* Floating Batch Action Bar */}
          {selectedQuestionIds.length > 0 && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-full border border-[#3b3b4f] bg-[#1f1f2b]/95 px-5 py-2 text-xs shadow-2xl backdrop-blur-md">
              <span className="flex items-center gap-1.5 text-white font-semibold">
                <span className="h-2 w-2 rounded-full bg-brand-orange inline-block" />
                Đã chọn {selectedQuestionIds.length} câu hỏi
              </span>
              <span className="text-zinc-600">|</span>
              <button
                type="button"
                className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Chuyển Sẵn sàng</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 text-zinc-300 hover:text-white font-medium transition-colors"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Lưu trữ</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 text-zinc-300 hover:text-white font-medium transition-colors"
              >
                <Tag className="h-3.5 w-3.5" />
                <span>Gắn tag</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 font-semibold text-white hover:bg-rose-700 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa đã chọn ({selectedQuestionIds.length})</span>
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-[#262635] bg-[#181822] text-zinc-400 uppercase text-[11px] font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedQuestionIds.length === DESIGN_SAMPLE_QUESTIONS.length}
                      onChange={handleToggleSelectAll}
                      className="h-4 w-4 rounded accent-brand-orange border-[#3a3a4c] bg-[#1e1e28] cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Câu hỏi</th>
                  <th className="py-3 px-3 w-28">Loại</th>
                  <th className="py-3 px-3 w-32">Tag</th>
                  <th className="py-3 px-3 w-28">Độ khó</th>
                  <th className="py-3 px-3 w-16 text-center">Điểm</th>
                  <th className="py-3 px-3 w-32 text-center">Trạng thái</th>
                  <th className="py-3 px-3 w-24 text-center">Đã dùng</th>
                  <th className="py-3 px-4 w-28 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#20202c]">
                {DESIGN_SAMPLE_QUESTIONS.map((q) => {
                  const isChecked = selectedQuestionIds.includes(q.id);
                  return (
                    <tr
                      key={q.id}
                      className={`hover:bg-[#1a1a24]/80 transition-colors ${
                        isChecked ? 'bg-[#181824]' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectOne(q.id)}
                          className="h-4 w-4 rounded accent-brand-orange border-[#3a3a4c] bg-[#1e1e28] cursor-pointer"
                        />
                      </td>

                      {/* Question Stem + Code Snippet */}
                      <td className="py-4 px-4 max-w-md">
                        <div className="font-semibold text-zinc-100 text-sm leading-relaxed">
                          {q.stem}
                        </div>
                        {q.codeSnippet && (
                          <div className="mt-2 inline-block rounded bg-[#0d0d14] border border-[#222230] px-3 py-1.5 font-mono text-[11px] text-zinc-400 leading-tight">
                            <pre className="whitespace-pre">{q.codeSnippet}</pre>
                          </div>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="py-4 px-3">
                        <span className="inline-block rounded border border-zinc-700/60 bg-zinc-800/60 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                          {q.typeLabel}
                        </span>
                      </td>

                      {/* Tags */}
                      <td className="py-4 px-3">
                        <div className="flex flex-wrap gap-1">
                          {q.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded bg-[#1e1e28] border border-[#2a2a3a] px-1.5 py-0.5 text-[10px] text-zinc-400"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Difficulty */}
                      <td className="py-4 px-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${q.difficultyColor}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current inline-block" />
                          {q.difficulty}
                        </span>
                      </td>

                      {/* Points */}
                      <td className="py-4 px-3 text-center font-bold text-zinc-200 text-xs">
                        {q.points.toFixed(1)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-3 text-center">
                        {q.statusBadge === 'READY' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700/80 bg-emerald-950/70 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Sẵn sàng</span>
                          </span>
                        )}
                        {q.statusBadge === 'DRAFT_AI' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-700/80 bg-amber-950/70 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
                            <Sparkles className="h-3 w-3 text-amber-400" />
                            <span>Nháp - AI tạo</span>
                          </span>
                        )}
                        {q.statusBadge === 'DRAFT' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
                            <span>Nháp</span>
                          </span>
                        )}
                        {q.statusBadge === 'ARCHIVED' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 text-[11px] font-medium text-zinc-500">
                            <span>Lưu trữ</span>
                          </span>
                        )}
                      </td>

                      {/* Usage */}
                      <td className="py-4 px-3 text-center text-xs">
                        {q.usageCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenUsage(q.id)}
                            className="text-zinc-300 hover:text-brand-orange hover:underline font-medium"
                          >
                            {q.usageText}
                          </button>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 text-zinc-400">
                          <button
                            type="button"
                            onClick={() => handleEdit(q)}
                            title="Chỉnh sửa câu hỏi"
                            className="p-1 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Sao chép câu hỏi"
                            className="p-1 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Tùy chọn khác"
                            className="p-1 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#262635] bg-[#181822] px-4 py-3 text-xs text-zinc-400">
            <div>
              Hiển thị <span className="font-semibold text-zinc-200">1 - 5</span> trong tổng số{' '}
              <span className="font-semibold text-zinc-200">125</span> câu hỏi (tối đa 50/trang)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="px-2 py-1 rounded text-zinc-400 hover:text-white hover:bg-[#252536] transition-colors"
              >
                &lt; Trước
              </button>
              <button
                type="button"
                className="h-7 w-7 rounded bg-brand-orange font-semibold text-white flex items-center justify-center text-xs shadow-sm"
              >
                1
              </button>
              <button
                type="button"
                className="h-7 w-7 rounded bg-[#20202c] text-zinc-300 hover:bg-[#28283a] flex items-center justify-center text-xs transition-colors"
              >
                2
              </button>
              <button
                type="button"
                className="h-7 w-7 rounded bg-[#20202c] text-zinc-300 hover:bg-[#28283a] flex items-center justify-center text-xs transition-colors"
              >
                3
              </button>
              <span className="px-1 text-zinc-500">...</span>
              <button
                type="button"
                className="px-2 py-1 rounded text-zinc-400 hover:text-white hover:bg-[#252536] transition-colors"
              >
                Sau &gt;
              </button>
            </div>
          </div>
        </div>

        {/* Section: Minh họa các kịch bản xử lý xóa câu hỏi (Modals Preview) */}
        <div className="space-y-4 pt-6 border-t border-[#262635]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Minh họa các kịch bản xử lý xóa câu hỏi (Modals Preview)
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Hệ thống áp dụng phân loại mức độ an toàn dữ liệu nhằm đảm bảo tính toàn vẹn của kết quả thi đã diễn ra.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Modal Preview 1: Single Delete Warning */}
            <div className="rounded-xl border border-[#2d2426] bg-[#181418] p-5 flex flex-col justify-between space-y-4 shadow-lg">
              <div className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-950/80 border border-rose-800 text-rose-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Xóa câu hỏi?</h3>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    Câu hỏi có ký hiệu vĩnh viễn khỏi ngân hàng câu hỏi này và không thể phục hồi.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  className="rounded-lg bg-[#252024] px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-[#2e282d] hover:text-white transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-rose-600/90 hover:bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition-colors"
                >
                  Xóa câu hỏi
                </button>
              </div>
            </div>

            {/* Modal Preview 2: Cannot Delete (In Use) */}
            <div className="rounded-xl border border-[#1e2638] bg-[#131722] p-5 flex flex-col justify-between space-y-4 shadow-lg">
              <div className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-950/80 border border-blue-800 text-blue-400">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Không thể xóa câu hỏi</h3>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    Câu hỏi đang nằm trong{' '}
                    <strong className="text-blue-300">2 bài kiểm tra: Giữa kỳ, Cuối kỳ</strong>.
                    Không thể xóa để bảo toàn dữ liệu kết quả bài thi. Bạn có thể chuyển câu hỏi sang trạng thái Lưu trữ.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  className="rounded-lg bg-[#1d2230] px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-[#262c3e] hover:text-white transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-brand-orange hover:bg-[#ea6d10] px-4 py-2 text-xs font-semibold text-white transition-colors"
                >
                  Chuyển sang Lưu trữ
                </button>
              </div>
            </div>

            {/* Modal Preview 3: Batch Delete */}
            <div className="rounded-xl border border-[#302520] bg-[#1a1513] p-5 flex flex-col justify-between space-y-4 shadow-lg">
              <div className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-950/80 border border-amber-800 text-amber-500">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Xóa 5 câu hỏi đã chọn?</h3>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    <strong className="text-rose-400">3 câu hỏi sẽ bị xóa vĩnh viễn</strong>,{' '}
                    <strong className="text-amber-300">2 câu hỏi</strong> đang được dùng trong các bài kiểm tra sẽ được tự động bỏ qua để bảo vệ dữ liệu điểm thi.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  className="rounded-lg bg-[#27201c] px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-[#322924] hover:text-white transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-rose-600/90 hover:bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition-colors"
                >
                  Xóa 3 câu hợp lệ
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Trạng thái phụ trợ (State Previews) */}
        <div className="space-y-4 pt-6 border-t border-[#262635]">
          <div className="flex items-center gap-2">
            <span className="text-lg">🖼️</span>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Trạng thái phụ trợ (State Previews)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Loading Skeleton */}
            <div className="rounded-xl border border-[#262635] bg-[#14141c] p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400 inline-block animate-ping" />
                <span>Đang tải danh sách câu hỏi...</span>
              </div>
              <div className="space-y-3 pt-2">
                <div className="h-6 w-3/4 rounded-md bg-[#222230] animate-pulse" />
                <div className="h-5 w-1/2 rounded-md bg-[#222230] animate-pulse" />
                <div className="flex gap-3">
                  <div className="h-6 w-24 rounded-md bg-[#222230] animate-pulse" />
                  <div className="h-6 w-24 rounded-md bg-[#222230] animate-pulse" />
                </div>
                <div className="h-5 w-4/5 rounded-md bg-[#222230] animate-pulse" />
              </div>
            </div>

            {/* Card 2: No questions in course */}
            <div className="rounded-xl border border-[#262635] bg-[#14141c] p-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-white text-sm">Khóa học chưa có câu hỏi nào</h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                Bắt đầu xây dựng ngân hàng câu hỏi để tạo các bài kiểm tra trắc nghiệm và đánh giá học tập.
              </p>
              <button
                type="button"
                onClick={handleCreateNew}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-orange px-4 py-2 text-xs font-semibold text-white hover:bg-[#ea6d10] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Thêm câu hỏi</span>
              </button>
            </div>

            {/* Card 3: Filter match none */}
            <div className="rounded-xl border border-[#262635] bg-[#14141c] p-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#20202c] border border-[#2e2e40] text-zinc-400">
                <FilterX className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-white text-sm">Không có câu hỏi phù hợp</h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                Thử thay đổi từ khóa tìm kiếm hoặc xóa các bộ lọc đang áp dụng.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-lg border border-[#343448] bg-transparent px-4 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-[#20202e] transition-colors"
              >
                Xóa bộ lọc
              </button>
            </div>

            {/* Card 4: No course yet */}
            <div className="rounded-xl border border-[#262635] bg-[#14141c] p-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-950/80 border border-blue-800 text-blue-400">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-white text-sm">Bạn chưa có khóa học nào</h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                Vui lòng tạo khóa học trước khi thiết lập ngân hàng câu hỏi.
              </p>
              <button
                type="button"
                onClick={() => navigate('/manage/courses')}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-colors"
              >
                Tạo khóa học ngay
              </button>
            </div>
          </div>
        </div>

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
