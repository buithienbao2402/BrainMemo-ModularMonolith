export interface MockCloItem {
  id: string;
  code: string;
  description: string;
  bloomLevelCode: string;
  weight: number;
  assessmentMethod: string;
}

export interface MockMatrixRow {
  blockId: string;
  title: string;
  sourceKind: string;
  unlinkedWarning?: boolean;
  weights: Record<string, number>; // cloCode/cloId -> percentage (e.g. { CLO1: 50 })
}

export const DEFAULT_CLOS: MockCloItem[] = [
  {
    id: 'clo-1',
    code: 'CL01',
    description:
      'Hiểu và giải thích được các nguyên lý nền tảng của cấu trúc dữ liệu nâng cao và thuật toán trong Python.',
    bloomLevelCode: 'UNDERSTAND',
    weight: 15,
    assessmentMethod: 'Quizzes trắc nghiệm thuật toán, Bài kiểm tra Lab 01',
  },
  {
    id: 'clo-2',
    code: 'CL02',
    description:
      'Thiết kế, xây dựng và tối ưu hóa các pipeline xử lý dữ liệu lớn với Pandas & Polars.',
    bloomLevelCode: 'APPLY',
    weight: 25,
    assessmentMethod: 'Bài tập thực hành xử lý 10M+ bản ghi dữ liệu tài chính',
  },
  {
    id: 'clo-3',
    code: 'CL03',
    description:
      'Ứng dụng các mô hình LLM và thư viện LangChain để phát triển ứng dụng AI trợ lý hội thoại thực tế.',
    bloomLevelCode: 'APPLY',
    weight: 30,
    assessmentMethod: 'Dự án giữa kỳ RAG Assistant & Vector Database',
  },
  {
    id: 'clo-4',
    code: 'CL04',
    description:
      'Phân tích, đánh giá hiệu năng mô hình AI và thực hiện kiểm thử tự động (Unit Test / Prompt Evaluation).',
    bloomLevelCode: 'ANALYZE',
    weight: 15,
    assessmentMethod: 'Báo cáo Benchmark độ trễ, sai lệch mô hình & CI/CD pipeline',
  },
  {
    id: 'clo-5',
    code: 'CL05',
    description:
      'Sáng tạo giải pháp AI hoàn chỉnh, tích hợp đa nguồn dữ liệu và triển khai thành công hệ thống trên máy chủ đám mây.',
    bloomLevelCode: 'CREATE',
    weight: 15,
    assessmentMethod: 'Đồ án tốt nghiệp khóa học (Capstone Final Project)',
  },
];

export const DEFAULT_RULES_CLOS: MockCloItem[] = [
  {
    id: 'clo-rule-1',
    code: 'CLO 1',
    description: 'Hiểu và vận dụng cú pháp Python & cấu trúc dữ liệu cơ bản',
    bloomLevelCode: 'UNDERSTAND',
    weight: 15,
    assessmentMethod: 'Quizzes trắc nghiệm thuật toán',
  },
  {
    id: 'clo-rule-2',
    code: 'CLO 2',
    description: 'Xử lý và làm sạch dữ liệu với thư viện Pandas, Polars',
    bloomLevelCode: 'APPLY',
    weight: 20,
    assessmentMethod: 'Bài tập thực hành dữ liệu',
  },
  {
    id: 'clo-rule-3',
    code: 'CLO 3',
    description: 'Xây dựng pipeline trích xuất, trực quan hóa dữ liệu thực tế',
    bloomLevelCode: 'APPLY',
    weight: 20,
    assessmentMethod: 'Dự án pipeline dữ liệu',
  },
  {
    id: 'clo-rule-4',
    code: 'CLO 4',
    description: 'Phân tích, đánh giá hiệu năng mô hình AI & kiểm thử tự động',
    bloomLevelCode: 'ANALYZE',
    weight: 15,
    assessmentMethod: 'Báo cáo benchmark',
  },
  {
    id: 'clo-rule-5',
    code: 'CLO 5',
    description: 'Tích hợp mô hình AI và phát triển ứng dụng thông minh',
    bloomLevelCode: 'CREATE',
    weight: 15,
    assessmentMethod: 'Đồ án tốt nghiệp',
  },
  {
    id: 'clo-rule-6',
    code: 'CLO 6',
    description: 'Kỹ năng làm việc nhóm, báo cáo kỹ thuật và bảo vệ đồ án',
    bloomLevelCode: 'APPLY',
    weight: 15,
    assessmentMethod: 'Báo cáo bảo vệ đồ án',
  },
];

export const DEFAULT_ASSESSMENT_ROWS: MockMatrixRow[] = [
  {
    blockId: 'mat-blk-1',
    title: '1. Chuyên cần & Mini Quiz',
    sourceKind: 'QUIZ',
    weights: { CL01: 50 },
  },
  {
    blockId: 'mat-blk-2',
    title: '2. Lab 01: Xử lý dữ liệu Pandas & Polars',
    sourceKind: 'ASSIGNMENT',
    unlinkedWarning: true,
    weights: {},
  },
  {
    blockId: 'mat-blk-3',
    title: '3. Lab 04: Pipeline Clean Data lớn',
    sourceKind: 'ASSIGNMENT',
    weights: { CL02: 60, CL03: 40 },
  },
  {
    blockId: 'mat-blk-4',
    title: '4. Midterm: Lý thuyết & Thuật toán',
    sourceKind: 'EXAM',
    weights: { CL01: 50, CL02: 40, CL04: 30 },
  },
  {
    blockId: 'mat-blk-5',
    title: '5. Assignment 2: Xây dựng Chatbot AI LangChain',
    sourceKind: 'ASSIGNMENT',
    weights: { CL03: 60, CL04: 40 },
  },
  {
    blockId: 'mat-blk-6',
    title: '6. Đồ án tốt nghiệp (Capstone Final Project)',
    sourceKind: 'CAPSTONE',
    weights: { CL04: 30, CL05: 80 },
  },
];

export const DEFAULT_MOET_SCALE = [
  { rank: 'Xuất sắc', minPct: 90, maxPct: 100, gpa10Min: 9.0, gpa10Max: 10.0, status: 'Xuất sắc', color: 'purple' },
  { rank: 'Giỏi', minPct: 80, maxPct: 90, gpa10Min: 8.0, gpa10Max: 8.9, status: 'Giỏi', color: 'green' },
  { rank: 'Khá', minPct: 70, maxPct: 80, gpa10Min: 7.0, gpa10Max: 7.9, status: 'Khá', color: 'blue' },
  { rank: 'Trung bình', minPct: 50, maxPct: 70, gpa10Min: 5.0, gpa10Max: 6.9, status: 'Đạt', color: 'yellow' },
  { rank: 'Yếu / Trượt môn', minPct: 0, maxPct: 50, gpa10Min: 0.0, gpa10Max: 5.0, status: 'Không đạt', color: 'red' },
];

export const DEFAULT_ECTS_SCALE = [
  { rank: 'Thang A (Xuất sắc)', minPct: 90, maxPct: 100, gpa10Min: 9.0, gpa10Max: 10.0, status: 'A - Điểm A', color: 'purple' },
  { rank: 'Thang B (Giỏi)', minPct: 80, maxPct: 90, gpa10Min: 8.0, gpa10Max: 8.9, status: 'B - Điểm B', color: 'green' },
  { rank: 'Thang C (Khá)', minPct: 70, maxPct: 80, gpa10Min: 7.0, gpa10Max: 7.9, status: 'C - Điểm C', color: 'blue' },
  { rank: 'Thang D (Trung bình)', minPct: 50, maxPct: 70, gpa10Min: 5.0, gpa10Max: 6.9, status: 'D - Điểm D', color: 'yellow' },
  { rank: 'Thang F (Không đạt)', minPct: 0, maxPct: 50, gpa10Min: 0.0, gpa10Max: 5.0, status: 'F - Trượt', color: 'red' },
];

export const DEFAULT_ACHIEVEMENT_LEVELS = [
  {
    id: 'ach-1',
    code: 'UNSATISFACTORY',
    title: 'Chưa đạt (Unsatisfactory)',
    description: 'Chưa đáp ứng chuẩn tối thiểu của học phần.',
    minPct: 0,
    maxPct: 50,
    isGeneralThreshold: true,
    dotColor: 'bg-rose-500',
  },
  {
    id: 'ach-2',
    code: 'DEVELOPING',
    title: 'Đạt chuẩn (Developing / Pass)',
    description: 'Nắm vững các khái niệm và kỹ năng cốt lõi.',
    minPct: 50,
    maxPct: 70,
    isGeneralThreshold: false,
    dotColor: 'bg-amber-500',
  },
  {
    id: 'ach-3',
    code: 'PROFICIENT',
    title: 'Tốt (Proficient)',
    description: 'Thao tác giải quyết bài toán độc lập, tự chủ.',
    minPct: 70,
    maxPct: 85,
    isGeneralThreshold: false,
    dotColor: 'bg-sky-500',
  },
  {
    id: 'ach-4',
    code: 'MASTERY',
    title: 'Xuất sắc (Advanced Mastery)',
    description: 'Năng lực sáng tạo và giải quyết bài toán phức tạp vượt yêu cầu.',
    minPct: 85,
    maxPct: 100,
    isGeneralThreshold: false,
    dotColor: 'bg-emerald-500',
  },
];
