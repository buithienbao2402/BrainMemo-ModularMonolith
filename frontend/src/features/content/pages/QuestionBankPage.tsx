import { useState, useRef, useEffect } from 'react';
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
  MoreVertical,
  Archive,
  Tag,
  BookOpen,
  RotateCcw,
  BarChart2,
} from 'lucide-react';
import {
  type QuestionItemDto,
  type QuestionFilterParams,
  type QuestionStatus,
  useQuestionsQuery,
} from '../api/contentApi';
import { QuestionEditorDrawer } from '../components/QuestionEditorDrawer';
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

interface SampleQuestion {
  id: string;
  stem: string;
  codeSnippet?: string;
  questionType: string;
  typeLabel: string;
  tags: string[];
  difficulty: string;
  difficultyColor: string;
  points: number;
  status: QuestionStatus;
  statusBadge: 'READY' | 'DRAFT_AI' | 'DRAFT' | 'ARCHIVED';
  usageText: string;
  usageCount: number;
}

// Sample questions matching the exact screenshot
const INITIAL_SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    id: 'sample-q-1',
    stem: 'Quy tắc tìm kiếm biến LEGB trong Python tuân theo thứ tự ưu tiên nào sau đây?',
    codeSnippet: 'Local ->\nEnclosing ->\nGlobal ->\nBuilt-in',
    questionType: 'MULTIPLE_CHOICE',
    typeLabel: 'Trắc nghiệm',
    tags: ['python', 'scope'],
    difficulty: 'Trung bình',
    difficultyColor: 'text-amber-500',
    points: 1.0,
    status: 'READY',
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
    difficultyColor: 'text-rose-500',
    points: 2.0,
    status: 'READY',
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
    difficultyColor: 'text-rose-500',
    points: 3.0,
    status: 'DRAFT',
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
    difficultyColor: 'text-emerald-500',
    points: 0.5,
    status: 'DRAFT',
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
    difficultyColor: 'text-amber-500',
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

  // List of questions (stateful for local deletions and status updates)
  const [questionsList, setQuestionsList] = useState<SampleQuestion[]>(INITIAL_SAMPLE_QUESTIONS);

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

  // Drawer state
  const [isUsageOpen, setIsUsageOpen] = useState(false);
  const [usageQuestion, setUsageQuestion] = useState<SampleQuestion | null>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Action Menu dropdown state (by question ID)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Deletion Modals state
  const [singleDeleteCandidate, setSingleDeleteCandidate] = useState<SampleQuestion | null>(null);
  const [cannotDeleteCandidate, setCannotDeleteCandidate] = useState<SampleQuestion | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // Close 3-dot menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Data fetching from API (falls back to sample list if empty)
  const filterParams: QuestionFilterParams = {
    search: search.trim() || undefined,
    type: selectedType || undefined,
    difficulty: selectedDifficulty ? Number(selectedDifficulty) : undefined,
    status: selectedStatus || undefined,
    tag: selectedTag.trim() || undefined,
  };

  const { data, refetch } = useQuestionsQuery(courseId, filterParams);
  const apiQuestions = data?.items ?? [];

  // Filtered local list
  const filteredQuestions = questionsList.filter((q) => {
    if (search.trim() && !q.stem.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedTag && !q.tags.includes(selectedTag)) return false;
    if (selectedType && q.questionType !== selectedType) return false;
    if (selectedStatus && q.status !== selectedStatus) return false;
    return true;
  });

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

  // Open usage drawer
  const handleOpenUsage = (question: SampleQuestion) => {
    setUsageQuestion(question);
    setIsUsageOpen(true);
    setActiveMenuId(null);
  };

  // Change question status via 3-dot menu
  const handleChangeStatus = (questionId: string, newStatus: QuestionStatus, badge: 'READY' | 'DRAFT' | 'ARCHIVED') => {
    setQuestionsList((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, status: newStatus, statusBadge: badge } : q))
    );
    setActiveMenuId(null);
  };

  // Click delete button on a row
  const handleClickDeleteRow = (q: SampleQuestion) => {
    setActiveMenuId(null);
    if (q.usageCount > 0) {
      // Question is in use -> cannot delete directly
      setCannotDeleteCandidate(q);
    } else {
      // Not in use -> can delete
      setSingleDeleteCandidate(q);
    }
  };

  // Confirm single delete
  const handleConfirmSingleDelete = () => {
    if (!singleDeleteCandidate) return;
    setQuestionsList((prev) => prev.filter((q) => q.id !== singleDeleteCandidate.id));
    setSelectedQuestionIds((prev) => prev.filter((id) => id !== singleDeleteCandidate.id));
    setSingleDeleteCandidate(null);
  };

  // Move in-use question to archived from Cannot Delete Modal
  const handleMoveToArchive = (qId: string) => {
    handleChangeStatus(qId, 'ARCHIVED' as unknown as QuestionStatus, 'ARCHIVED');
    setCannotDeleteCandidate(null);
  };

  // Confirm batch delete
  const handleConfirmBatchDelete = () => {
    // Delete only questions that have usageCount === 0
    setQuestionsList((prev) =>
      prev.filter((q) => !selectedQuestionIds.includes(q.id) || q.usageCount > 0)
    );
    setSelectedQuestionIds([]);
    setIsBatchDeleteModalOpen(false);
  };

  const handleExport = () => {
    window.open(`/api/v1/courses/${courseId}/questions/export`, '_blank');
  };

  const handleToggleSelectAll = () => {
    if (selectedQuestionIds.length === filteredQuestions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(filteredQuestions.map((q) => q.id));
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
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Ngân hàng câu hỏi
            </h1>
            <span className="sr-only">Ngân hàng câu hỏi (SCR-CNT-04)</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors shadow-xs"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              <span>Nhập Excel/CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors shadow-xs"
            >
              <Download className="h-4 w-4 text-muted-foreground" />
              <span>Xuất</span>
            </button>

            <button
              type="button"
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[#ea6d10] active:bg-[#d8620c] transition-colors"
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
              className="w-full flex items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-brand-orange/40 shadow-xs"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-base">
                      {selectedCourse.name}
                    </span>
                    <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {selectedCourse.scope}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedCourse.questionCount} câu hỏi
                  </p>
                </div>
              </div>
              <div className="text-muted-foreground">
                {isCourseDropdownOpen ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </button>

            {/* Dropdown Menu */}
            {isCourseDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-30 mt-2 rounded-xl border border-border bg-card p-3 shadow-2xl backdrop-blur-xl space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    placeholder="Tìm khóa học..."
                    className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-orange"
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
                            ? 'bg-muted text-foreground font-semibold'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <BookOpen className="h-4 w-4 text-amber-500 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-foreground">{c.name}</span>
                              <span className="text-[10px] rounded px-1.5 py-0.2 bg-muted text-muted-foreground border border-border">
                                {c.scope}
                              </span>
                            </div>
                            <span className="text-muted-foreground text-[11px]">
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
          <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground pl-1">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              <strong className="text-foreground">95</strong> sẵn sàng
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
              <strong className="text-foreground">25</strong> nháp
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
              <strong className="text-foreground">5</strong> lưu trữ
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="rounded-xl border border-border bg-card p-3 flex flex-wrap items-center gap-3 shadow-xs">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm câu hỏi theo đề mục..."
              className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-orange"
            />
          </div>

          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-brand-orange"
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
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-brand-orange"
          >
            <option value="">Độ khó: Tất cả</option>
            <option value="1">Dễ</option>
            <option value="2">Trung bình</option>
            <option value="3">Khó</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-brand-orange"
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
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-brand-orange"
          >
            <option value="">Trạng thái: Tất cả</option>
            <option value="READY">Sẵn sàng</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="ARCHIVED">Lưu trữ</option>
          </select>

          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Xóa bộ lọc</span>
          </button>
        </div>

        {/* Questions Data Table */}
        <div className="relative rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          
          {/* Floating Batch Action Bar */}
          {selectedQuestionIds.length > 0 && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-full border border-border bg-card/95 px-5 py-2 text-xs shadow-xl backdrop-blur-md">
              <span className="flex items-center gap-1.5 text-foreground font-semibold">
                <span className="h-2 w-2 rounded-full bg-brand-orange inline-block" />
                Đã chọn {selectedQuestionIds.length} câu hỏi
              </span>
              <span className="text-muted-foreground">|</span>
              <button
                type="button"
                onClick={() => {
                  setQuestionsList((prev) =>
                    prev.map((q) =>
                      selectedQuestionIds.includes(q.id)
                        ? { ...q, status: 'READY', statusBadge: 'READY' }
                        : q
                    )
                  );
                }}
                className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:opacity-80 font-medium transition-opacity"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Chuyển Sẵn sàng</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuestionsList((prev) =>
                    prev.map((q) =>
                      selectedQuestionIds.includes(q.id)
                        ? { ...q, status: 'ARCHIVED' as unknown as QuestionStatus, statusBadge: 'ARCHIVED' }
                        : q
                    )
                  );
                }}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Lưu trữ</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                <Tag className="h-3.5 w-3.5" />
                <span>Gắn tag</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 font-semibold text-white hover:bg-rose-700 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa đã chọn ({selectedQuestionIds.length})</span>
              </button>
            </div>
          )}

          {/* Table content or auxiliary empty/loading states */}
          {filteredQuestions.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              {search || selectedTag || selectedDifficulty || selectedType || selectedStatus ? (
                /* State: Filter match none */
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted border border-border text-muted-foreground">
                    <FilterX className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-foreground text-sm">Không có câu hỏi phù hợp</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Thử thay đổi từ khóa tìm kiếm hoặc xóa các bộ lọc đang áp dụng.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="rounded-lg border border-border bg-background px-4 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              ) : (
                /* State: No questions in course */
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-foreground text-sm">Khóa học chưa có câu hỏi nào</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
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
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-border bg-muted/50 text-muted-foreground uppercase text-[11px] font-semibold tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedQuestionIds.length === filteredQuestions.length}
                        onChange={handleToggleSelectAll}
                        className="h-4 w-4 rounded accent-brand-orange border-border cursor-pointer"
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
                <tbody className="divide-y divide-border">
                  {filteredQuestions.map((q) => {
                    const isChecked = selectedQuestionIds.includes(q.id);
                    const isMenuOpen = activeMenuId === q.id;

                    return (
                      <tr
                        key={q.id}
                        className={`hover:bg-muted/40 transition-colors ${
                          isChecked ? 'bg-muted/20' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-4 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectOne(q.id)}
                            className="h-4 w-4 rounded accent-brand-orange border-border cursor-pointer"
                          />
                        </td>

                        {/* Question Stem + Code Snippet */}
                        <td className="py-4 px-4 max-w-md">
                          <div className="font-semibold text-foreground text-sm leading-relaxed">
                            {q.stem}
                          </div>
                          {q.codeSnippet && (
                            <div className="mt-2 inline-block rounded bg-muted/60 border border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground leading-tight">
                              <pre className="whitespace-pre">{q.codeSnippet}</pre>
                            </div>
                          )}
                        </td>

                        {/* Type Badge */}
                        <td className="py-4 px-3">
                          <span className="inline-block rounded border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-foreground">
                            {q.typeLabel}
                          </span>
                        </td>

                        {/* Tags */}
                        <td className="py-4 px-3">
                          <div className="flex flex-wrap gap-1">
                            {q.tags.map((t) => (
                              <span
                                key={t}
                                className="rounded bg-muted border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground"
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
                        <td className="py-4 px-3 text-center font-bold text-foreground text-xs">
                          {q.points.toFixed(1)}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-3 text-center">
                          {q.statusBadge === 'READY' && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Sẵn sàng</span>
                            </span>
                          )}
                          {q.statusBadge === 'DRAFT_AI' && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                              <Sparkles className="h-3 w-3" />
                              <span>Nháp - AI tạo</span>
                            </span>
                          )}
                          {q.statusBadge === 'DRAFT' && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                              <span>Nháp</span>
                            </span>
                          )}
                          {q.statusBadge === 'ARCHIVED' && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                              <span>Lưu trữ</span>
                            </span>
                          )}
                        </td>

                        {/* Usage */}
                        <td className="py-4 px-3 text-center text-xs">
                          {q.usageCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenUsage(q)}
                              className="text-foreground hover:text-brand-orange hover:underline font-medium"
                            >
                              {q.usageText}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Actions: Edit, Delete (replace Copy), 3-Dot Menu */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1 text-muted-foreground relative">
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleEdit(q)}
                              title="Chỉnh sửa câu hỏi"
                              className="p-1.5 hover:text-foreground hover:bg-muted rounded transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            {/* Delete Button (replaces Copy) */}
                            <button
                              type="button"
                              onClick={() => handleClickDeleteRow(q)}
                              title="Xóa câu hỏi"
                              className="p-1.5 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            {/* 3-Dot Menu Button */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId((prev) => (prev === q.id ? null : q.id));
                                }}
                                title="Tùy chọn khác"
                                className="p-1.5 hover:text-foreground hover:bg-muted rounded transition-colors"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>

                              {/* Dropdown Menu */}
                              {isMenuOpen && (
                                <div
                                  ref={menuRef}
                                  className="absolute right-0 top-full z-30 mt-1 w-48 rounded-xl border border-border bg-card p-1.5 shadow-xl backdrop-blur-md text-left text-xs space-y-0.5"
                                >
                                  {/* Chuyển sẵn sàng */}
                                  <button
                                    type="button"
                                    onClick={() => handleChangeStatus(q.id, 'READY', 'READY')}
                                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-foreground hover:bg-muted transition-colors"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                    <span>Chuyển sẵn sàng</span>
                                  </button>

                                  {/* Lưu trữ */}
                                  <button
                                    type="button"
                                    onClick={() => handleChangeStatus(q.id, 'ARCHIVED' as unknown as QuestionStatus, 'ARCHIVED')}
                                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-foreground hover:bg-muted transition-colors"
                                  >
                                    <Archive className="h-3.5 w-3.5 text-amber-500" />
                                    <span>Lưu trữ</span>
                                  </button>

                                  {/* Xem thông tin sử dụng */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenUsage(q)}
                                    className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-brand-orange hover:bg-brand-orange/10 transition-colors font-medium"
                                  >
                                    <BarChart2 className="h-3.5 w-3.5" />
                                    <span>Xem thông tin sử dụng</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            <div>
              Hiển thị <span className="font-semibold text-foreground">1 - {filteredQuestions.length}</span> trong tổng số{' '}
              <span className="font-semibold text-foreground">125</span> câu hỏi (tối đa 50/trang)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                &lt; Trước
              </button>
              <button
                type="button"
                className="h-7 w-7 rounded bg-brand-orange font-semibold text-white flex items-center justify-center text-xs shadow-xs"
              >
                1
              </button>
              <button
                type="button"
                className="h-7 w-7 rounded bg-muted text-foreground hover:bg-muted/80 flex items-center justify-center text-xs transition-colors"
              >
                2
              </button>
              <button
                type="button"
                className="h-7 w-7 rounded bg-muted text-foreground hover:bg-muted/80 flex items-center justify-center text-xs transition-colors"
              >
                3
              </button>
              <span className="px-1 text-muted-foreground">...</span>
              <button
                type="button"
                className="px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Sau &gt;
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL 1: Single Delete Warning (Khi câu hỏi chưa nằm trong bài thi nào) */}
      {singleDeleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50 duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">Xóa câu hỏi?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Câu hỏi sẽ bị xóa vĩnh viễn khỏi ngân hàng câu hỏi này và không thể phục hồi.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSingleDeleteCandidate(null)}
                className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                className="rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-semibold text-white transition-colors"
              >
                Xóa câu hỏi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Cannot Delete Question (Khi câu hỏi đang nằm trong bài kiểm tra) */}
      {cannotDeleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50 duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">Không thể xóa câu hỏi</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Câu hỏi đang nằm trong{' '}
                  <strong className="text-foreground">2 bài kiểm tra: Giữa kỳ, Cuối kỳ</strong>.
                  Không thể xóa để bảo toàn dữ liệu kết quả bài thi. Bạn có thể chuyển câu hỏi sang trạng thái Lưu trữ.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCannotDeleteCandidate(null)}
                className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => handleMoveToArchive(cannotDeleteCandidate.id)}
                className="rounded-lg bg-brand-orange hover:bg-[#ea6d10] px-4 py-2 text-xs font-semibold text-white transition-colors"
              >
                Chuyển sang Lưu trữ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Batch Delete Modal (Khi xóa nhiều câu hỏi đã chọn) */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50 duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">
                  Xóa {selectedQuestionIds.length} câu hỏi đã chọn?
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  <strong className="text-rose-500">3 câu hỏi sẽ bị xóa vĩnh viễn</strong>,{' '}
                  <strong className="text-amber-500">2 câu hỏi</strong> đang được dùng trong các bài kiểm tra sẽ được tự động bỏ qua để bảo vệ dữ liệu điểm thi.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                className="rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-semibold text-white transition-colors"
              >
                Xóa 3 câu hợp lệ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Drawer (Bảng trượt Sửa / Thêm câu hỏi) */}
      <QuestionEditorDrawer
        courseId={courseId}
        question={selectedQuestion}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSaved={() => refetch()}
        onViewUsage={(qId) => {
          setIsEditorOpen(false);
          const found = questionsList.find((q) => q.id === qId) || questionsList[0]!;
          handleOpenUsage(found);
        }}
      />

      {/* Usage Drawer (Hiển thị khi click Xem thông tin sử dụng trong menu 3 chấm) */}
      <QuestionUsageDrawer
        courseId={courseId}
        questionId={usageQuestion?.id ?? null}
        questionStem={usageQuestion?.stem}
        questionTypeLabel={usageQuestion?.typeLabel}
        tags={usageQuestion?.tags}
        difficulty={usageQuestion?.difficulty}
        points={usageQuestion?.points}
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
