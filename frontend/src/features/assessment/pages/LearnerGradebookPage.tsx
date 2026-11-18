import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Trophy,
  Compass,
  RotateCw,
  ChevronDown,
  ChevronUp,
  FileText,
  Terminal,
  Database,
  BookOpen,
  Bot,
  Award,
} from 'lucide-react';
import { useToast } from '@/shared/ui';
import { useMyGradebook } from '../api/assessmentApi';

interface AssessmentComponent {
  id: string;
  name: string;
  iconType: 'quiz' | 'pandas' | 'pipeline' | 'midterm' | 'chatbot' | 'capstone';
  weight: string;
  appliedRule: string;
  score: string;
}

interface CloItem {
  id: string;
  code: string;
  title: string;
  bloom: string;
  weight: string;
  percent: number;
  gradeBadge: string;
  isExcellent?: boolean;
  mappedComponents: string[];
}

interface PloItem {
  id: string;
  code: string;
  title: string;
  percent: number;
  mappedFrom: string;
}

const ASSESSMENT_COMPONENTS: AssessmentComponent[] = [
  {
    id: 'comp-1',
    name: 'Chuyên cần & Mini Quiz',
    iconType: 'quiz',
    weight: '10%',
    appliedRule: 'Cao nhất',
    score: '9.5 / 10',
  },
  {
    id: 'comp-2',
    name: 'Lab 01: Xử lý dữ liệu Pandas & Polars',
    iconType: 'pandas',
    weight: '15%',
    appliedRule: 'Gần nhất',
    score: '8.5 / 10',
  },
  {
    id: 'comp-3',
    name: 'Lab 04: Pipeline Clean Data lớn',
    iconType: 'pipeline',
    weight: '15%',
    appliedRule: 'Gần nhất',
    score: '8.0 / 10',
  },
  {
    id: 'comp-4',
    name: 'Midterm: Lý thuyết & Thuật toán',
    iconType: 'midterm',
    weight: '20%',
    appliedRule: 'Cao nhất',
    score: '7.5 / 10',
  },
  {
    id: 'comp-5',
    name: 'Assignment 2: Xây dựng Chatbot AI',
    iconType: 'chatbot',
    weight: '20%',
    appliedRule: 'Cao nhất',
    score: '8.0 / 10',
  },
  {
    id: 'comp-6',
    name: 'Đồ án tốt nghiệp (Capstone Final Project)',
    iconType: 'capstone',
    weight: '20%',
    appliedRule: 'Cao nhất',
    score: '8.5 / 10',
  },
];

const CLOS_DATA: CloItem[] = [
  {
    id: 'clo-1',
    code: 'CLO1',
    title: 'Cú pháp, cấu trúc dữ liệu & Thuật toán cơ bản',
    bloom: 'Bloom: C2 - Hiểu',
    weight: 'Trọng số 25%',
    percent: 91.5,
    gradeBadge: 'Xuất sắc (≥ 85%)',
    isExcellent: true,
    mappedComponents: ['Chuyên cần & Mini Quiz', 'Midterm: Lý thuyết & Thuật toán'],
  },
  {
    id: 'clo-2',
    code: 'CLO2',
    title: 'Xử lý dữ liệu Pandas & Polars tối ưu',
    bloom: 'Bloom: C3 - Vận dụng',
    weight: 'Trọng số 20%',
    percent: 82.0,
    gradeBadge: 'Tốt (70% - 84%)',
    isExcellent: false,
    mappedComponents: ['Lab 01: Xử lý dữ liệu Pandas & Polars'],
  },
  {
    id: 'clo-3',
    code: 'CLO3',
    title: 'Machine Learning cơ bản & Tích hợp LLM Prompting',
    bloom: 'Bloom: C3 - Vận dụng',
    weight: 'Trọng số 20%',
    percent: 78.0,
    gradeBadge: 'Tốt (70% - 84%)',
    isExcellent: false,
    mappedComponents: ['Lab 04: Pipeline Clean Data lớn'],
  },
  {
    id: 'clo-4',
    code: 'CLO4',
    title: 'Deep Learning & Đánh giá hiệu năng giải thuật AI',
    bloom: 'Bloom: C4-C5 - Phân tích, Đánh giá',
    weight: 'Trọng số 15%',
    percent: 80.0,
    gradeBadge: 'Tốt (70% - 84%)',
    isExcellent: false,
    mappedComponents: ['Assignment 2: Xây dựng Chatbot AI'],
  },
  {
    id: 'clo-5',
    code: 'CLO5',
    title: 'Đồ án thực tiễn, Đóng gói Docker & Triển khai FastAPI',
    bloom: 'Bloom: C6 - Sáng tạo',
    weight: 'Trọng số 20%',
    percent: 86.5,
    gradeBadge: 'Xuất sắc (≥ 85%)',
    isExcellent: true,
    mappedComponents: ['Đồ án tốt nghiệp (Capstone Final Project)'],
  },
];

const PLOS_DATA: PloItem[] = [
  {
    id: 'plo-1',
    code: 'PLO 1',
    title: 'Nền tảng CNTT, Giải thuật & Tư duy hướng đối tượng',
    percent: 94.0,
    mappedFrom: 'Ánh xạ từ CLO1',
  },
  {
    id: 'plo-3',
    code: 'PLO 3',
    title: 'Xử lý dữ liệu lớn & Ứng dụng mô hình AI',
    percent: 86.0,
    mappedFrom: 'Ánh xạ từ CLO2, CLO3',
  },
  {
    id: 'plo-4',
    code: 'PLO 4',
    title: 'Thiết kế hệ thống & Triển khai dịch vụ an toàn',
    percent: 83.5,
    mappedFrom: 'Ánh xạ từ CLO4, CLO5',
  },
];

export function LearnerGradebookPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { pushToast } = useToast();
  const { data: gradebook } = useMyGradebook(courseId || '');

  const [isExporting, setIsExporting] = useState(false);
  const [expandedClo, setExpandedClo] = useState<string | null>(null);

  const hasGradebook = Boolean(
    gradebook && gradebook.totalGrade !== null && gradebook.totalGrade !== undefined
  );
  const displayScore = hasGradebook ? gradebook!.totalGrade!.toFixed(2) : '8,2';

  // Determine course title
  const courseTitle =
    courseId === 'dsa'
      ? 'Cấu trúc dữ liệu & Giải thuật'
      : courseId === 'web' || courseId === 'web-django'
      ? 'Lập trình Web Django & FastAPI'
      : 'Lập trình Python cơ bản';

  const handleExportPdf = () => {
    setIsExporting(true);
    pushToast({
      title: 'Đang khởi tạo bản in PDF bảng điểm cá nhân...',
      tone: 'default',
    });
    setTimeout(() => {
      setIsExporting(false);
      pushToast({
        title: 'Đã xuất file bảng điểm PDF thành công!',
        tone: 'success',
      });
    }, 1500);
  };

  const renderComponentIcon = (type: AssessmentComponent['iconType']) => {
    switch (type) {
      case 'quiz':
        return <FileText className="w-4 h-4 text-sky-400" />;
      case 'pandas':
        return <Terminal className="w-4 h-4 text-emerald-400" />;
      case 'pipeline':
        return <Database className="w-4 h-4 text-amber-400" />;
      case 'midterm':
        return <BookOpen className="w-4 h-4 text-blue-400" />;
      case 'chatbot':
        return <Bot className="w-4 h-4 text-purple-400" />;
      case 'capstone':
        return <Award className="w-4 h-4 text-orange-400" />;
      default:
        return <FileText className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Back Link & Header Row */}
      <div className="space-y-3">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-1 h-6 rounded-full bg-[#f97316] shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-zinc-900 dark:text-white">
                Bảng điểm: {courseTitle}
              </h1>
              <p className="sr-only">Kết quả học tập & Sổ điểm của bạn</p>
            </div>
          </div>

          {/* Export PDF Button */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="self-start sm:self-auto h-9 px-4 rounded-full bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-75 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${isExporting ? 'animate-spin' : ''}`}
            />
            <span>{isExporting ? 'Đang xuất bản PDF...' : 'Đang xuất bản PDF...'}</span>
          </button>
        </div>
      </div>

      {/* TOP SUMMARY CARD */}
      <div className="rounded-2xl border border-zinc-200 dark:border-[#22242b] bg-white dark:bg-[#141519] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Overall GPA & Badges */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">
            ĐIỂM TỔNG KẾT TÍCH LŨY
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white">
              {displayScore}
            </span>
            <span className="text-sm text-zinc-400 font-normal">/ 10</span>
          </div>
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Xếp loại: Giỏi</span>
            </span>

            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 inline-flex items-center gap-1.5">
              <span>✓</span>
              <span>Đạt chuẩn đầu ra (5/5 CLO)</span>
            </span>
          </div>
        </div>

        {/* Right: 3 Stat Blocks */}
        <div className="flex items-center gap-3 sm:gap-4 self-stretch md:self-auto justify-between sm:justify-end">
          {/* Stat 1: Bài đã nộp */}
          <div className="flex-1 sm:flex-initial min-w-[100px] flex flex-col items-center sm:items-start text-center sm:text-left px-3.5 sm:px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-1.5 text-sky-500 mb-0.5">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                6 / 6
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 font-medium">Bài đã nộp</span>
          </div>

          {/* Stat 2: Xếp hạng lớp */}
          <div className="flex-1 sm:flex-initial min-w-[100px] flex flex-col items-center sm:items-start text-center sm:text-left px-3.5 sm:px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-1.5 text-amber-500 mb-0.5">
              <Trophy className="w-4 h-4" />
              <span className="text-base sm:text-lg font-bold text-amber-500 dark:text-amber-400">
                Top 15%
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 font-medium">Xếp hạng lớp</span>
          </div>

          {/* Stat 3: ĐTB toàn lớp */}
          <div className="flex-1 sm:flex-initial min-w-[100px] flex flex-col items-center sm:items-start text-center sm:text-left px-3.5 sm:px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-0.5">
              <Compass className="w-4 h-4" />
              <span className="text-base sm:text-lg font-bold text-zinc-800 dark:text-zinc-200">
                7.8
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 font-medium">ĐTB toàn lớp</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: BẢNG ĐIỂM THÀNH PHẦN */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="w-1 h-5 rounded-full bg-[#f97316]" />
          <h2 className="text-sm font-bold tracking-wider text-zinc-800 dark:text-zinc-100 uppercase">
            BẢNG ĐIỂM THÀNH PHẦN
          </h2>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-[#22242b] bg-white dark:bg-[#141519] p-5 sm:p-6 overflow-x-auto shadow-xs">
          <table className="w-full text-left border-collapse min-w-[680px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                <th className="py-2.5 pr-4">THÀNH PHẦN ĐÁNH GIÁ</th>
                <th className="py-2.5 px-4 text-center">TRỌNG SỐ</th>
                <th className="py-2.5 px-4 text-center">ĐIỂM ÁP DỤNG</th>
                <th className="py-2.5 pl-4 text-right">ĐIỂM SỐ / TỐI ĐA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
              {ASSESSMENT_COMPONENTS.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 transition-colors"
                >
                  {/* Name with icon */}
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-2.5 font-semibold text-zinc-800 dark:text-zinc-200">
                      {renderComponentIcon(item.iconType)}
                      <span>{item.name}</span>
                    </div>
                  </td>

                  {/* Weight */}
                  <td className="py-3.5 px-4 text-center text-zinc-600 dark:text-zinc-400 font-medium">
                    {item.weight}
                  </td>

                  {/* Applied rule */}
                  <td className="py-3.5 px-4 text-center text-zinc-500 dark:text-zinc-400">
                    {item.appliedRule}
                  </td>

                  {/* Score / Max */}
                  <td className="py-3.5 pl-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                    {item.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 3: MỨC ĐẠT CHUẨN ĐẦU RA MÔN HỌC (CLO) & CHUẨN ĐẦU RA CTĐT (PLO) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: CLO (col-span-8) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-1 h-5 rounded-full bg-[#f97316]" />
            <h2 className="text-sm font-bold tracking-wider text-zinc-800 dark:text-zinc-100 uppercase">
              MỨC ĐẠT CHUẨN ĐẦU RA MÔN HỌC (CLO)
            </h2>
          </div>

          <div className="space-y-3">
            {CLOS_DATA.map((clo) => {
              const isExpanded = expandedClo === clo.id;
              return (
                <div
                  key={clo.id}
                  className="rounded-2xl border border-zinc-200 dark:border-[#22242b] bg-white dark:bg-[#141519] p-4 sm:p-5 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700/60 transition-all cursor-pointer"
                  onClick={() => setExpandedClo(isExpanded ? null : clo.id)}
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: Code, Title, Bloom */}
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-sm font-extrabold text-amber-500 shrink-0 mt-0.5">
                        {clo.code}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {clo.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {clo.bloom} • {clo.weight}
                        </p>
                      </div>
                    </div>

                    {/* Right: Percent, Grade Badge & Chevron */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-extrabold text-zinc-900 dark:text-white">
                          {clo.percent.toFixed(1)}%
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold mt-0.5 ${
                            clo.isExcellent
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                              : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40'
                          }`}
                        >
                          {clo.gradeBadge}
                        </span>
                      </div>
                      <div className="p-1 text-zinc-400 hover:text-foreground">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3.5 h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#f97316] transition-all duration-500"
                      style={{ width: `${clo.percent}%` }}
                    />
                  </div>

                  {/* Collapsible details preview */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          Thành phần liên kết:{' '}
                        </span>
                        <span>{clo.mappedComponents.join(', ')}</span>
                      </div>
                      <span className="text-[11px] text-[#f97316] font-medium">
                        Xem chi tiết đánh giá
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: PLO (col-span-4) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-1 h-5 rounded-full bg-sky-500" />
            <h2 className="text-sm font-bold tracking-wider text-zinc-800 dark:text-zinc-100 uppercase">
              CHUẨN ĐẦU RA CTĐT (PLO)
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-[#22242b] bg-white dark:bg-[#141519] p-5 sm:p-6 space-y-6 shadow-xs">
            {PLOS_DATA.map((plo) => (
              <div key={plo.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-900 dark:text-white">
                  <span>{plo.code}</span>
                  <span className="text-sm font-extrabold">{plo.percent.toFixed(1)}%</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {plo.title}
                </p>
                <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-[#f97316] transition-all duration-500"
                    style={{ width: `${plo.percent}%` }}
                  />
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 pt-0.5">
                  {plo.mappedFrom}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
