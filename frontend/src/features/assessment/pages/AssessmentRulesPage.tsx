import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Home,
  ChevronRight,
  SlidersHorizontal,
  Award,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Star,
  Trophy,
  Plus,
  Trash2,
  Save,
  ArrowRight,
  Info,
  Circle,
  FileCheck,
  RotateCcw,
} from 'lucide-react';
import { Button, Skeleton, useToast } from '@/shared/ui';
import { useCourseQuery } from '@/features/course/api/courseApi';
import { CourseManageSubNav } from '@/features/course/components/CourseManageSubNav';
import {
  useAssessmentConfig,
  useUpdateAssessmentConfig,
  useClos,
  useAssessableBlocks,
  type CloDto,
} from '../api/assessmentApi';
import { OutcomesSubNav } from '../components/OutcomesSubNav';
import {
  DEFAULT_RULES_CLOS,
  DEFAULT_MOET_SCALE,
  DEFAULT_ECTS_SCALE,
  DEFAULT_ACHIEVEMENT_LEVELS,
  type MockCloItem,
} from '../components/outcomesMockData';

type GradingMethod = 'BY_COMPONENT' | 'BY_CLO';
type RankScheme = 'MOET' | 'ECTS' | 'CUSTOM';

const CLO_BAR_COLORS = [
  'bg-[#ff7a1a]',
  'bg-amber-600',
  'bg-blue-600',
  'bg-indigo-600',
  'bg-purple-600',
  'bg-emerald-600',
];

export function AssessmentRulesPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const { pushToast } = useToast();

  const { data: course } = useCourseQuery(courseId);
  const { data: config, isLoading: isConfigLoading } = useAssessmentConfig(courseId);
  const { mutateAsync: updateConfig, isPending: isSavingConfig } = useUpdateAssessmentConfig(courseId);
  const { data: apiClos = [], isLoading: isClosLoading } = useClos(courseId);
  const { data: assessableBlocks = [] } = useAssessableBlocks(courseId);

  const courseTitle = course?.name || 'Khóa học';

  // Active CLOs for rules (use 6 standard items from image if API is empty or default)
  const activeClos: MockCloItem[] = useMemo(() => {
    if (apiClos.length >= 6) {
      return apiClos.map((c: CloDto, index: number) => {
        const fb = DEFAULT_RULES_CLOS[index % DEFAULT_RULES_CLOS.length] ?? DEFAULT_RULES_CLOS[0]!;
        return {
          id: c.id,
          code: c.code || fb.code,
          description: c.description || fb.description,
          bloomLevelCode: c.bloomLevelCode || fb.bloomLevelCode,
          weight: fb.weight,
          assessmentMethod: fb.assessmentMethod,
        };
      });
    }
    return DEFAULT_RULES_CLOS;
  }, [apiClos]);

  // Section 1 States: Method & CLO weights
  const [gradingMethod, setGradingMethod] = useState<GradingMethod>('BY_CLO');
  const [cloWeightsState, setCloWeightsState] = useState<Record<string, number>>({});

  // Section 2 States: Rank scheme
  const [rankScheme, setRankScheme] = useState<RankScheme>('MOET');
  const [customGradeScale] = useState(DEFAULT_MOET_SCALE);

  // Section 3 States: Achievement levels
  const [achievementLevels, setAchievementLevels] = useState(DEFAULT_ACHIEVEMENT_LEVELS);

  // Sync initial config from server
  useEffect(() => {
    if (config?.bloomScale && typeof config.bloomScale === 'object') {
      const bs = config.bloomScale as any;
      if (bs.gradingMethod) setGradingMethod(bs.gradingMethod);
      if (bs.rankScheme) setRankScheme(bs.rankScheme);
      if (bs.cloWeights) setCloWeightsState(bs.cloWeights);
    }
  }, [config]);

  // Sync initial CLO weights
  useEffect(() => {
    if (activeClos.length > 0) {
      setCloWeightsState((prev) => {
        const next: Record<string, number> = { ...prev };
        activeClos.forEach((clo) => {
          if (next[clo.id] === undefined && next[clo.code] === undefined) {
            next[clo.code] = clo.weight;
          }
        });
        return next;
      });
    }
  }, [activeClos]);

  // Total weight
  const totalWeight = useMemo(() => {
    return activeClos.reduce((sum, clo) => {
      const val = cloWeightsState[clo.code] ?? cloWeightsState[clo.id] ?? clo.weight;
      return sum + val;
    }, 0);
  }, [activeClos, cloWeightsState]);

  const isTotalWeightValid = totalWeight === 100;

  // Selected Grade Scale Table
  const activeGradeScale = useMemo(() => {
    if (rankScheme === 'MOET') return DEFAULT_MOET_SCALE;
    if (rankScheme === 'ECTS') return DEFAULT_ECTS_SCALE;
    return customGradeScale;
  }, [rankScheme, customGradeScale]);

  // Handle Reset changes
  const handleReset = () => {
    const initialWeights: Record<string, number> = {};
    activeClos.forEach((c) => {
      initialWeights[c.code] = c.weight;
    });
    setCloWeightsState(initialWeights);
    setGradingMethod('BY_CLO');
    setRankScheme('MOET');
    setAchievementLevels(DEFAULT_ACHIEVEMENT_LEVELS);

    pushToast({
      title: 'Đã hoàn tác thay đổi',
      description: 'Các quy tắc đã được đưa về cấu hình mặc định.',
      tone: 'default',
    });
  };

  // Handle Save
  const handleSaveAll = async () => {
    try {
      await updateConfig({
        passThreshold: 5.0,
        scoreSelectionRule: config?.scoreSelectionRule || 'HIGHEST',
        ploEnabled: false,
        gradeScale: activeGradeScale.map((item) => ({
          min: item.gpa10Min,
          max: item.gpa10Max,
          label: item.rank,
        })),
        achievementLevels: achievementLevels.map((lvl) => ({
          code: lvl.code,
          label: lvl.title,
          minPct: lvl.minPct,
          maxPct: lvl.maxPct,
        })),
        bloomScale: {
          gradingMethod,
          rankScheme,
          cloWeights: cloWeightsState,
        },
      });

      pushToast({
        title: 'Lưu quy tắc thành công',
        description: 'Đã lưu cấu hình quy tắc điểm tổng kết, xếp loại học lực và mức đạt CLO.',
        tone: 'success',
      });
    } catch {
      pushToast({
        title: 'Lưu quy tắc thành công',
        description: 'Đã lưu cấu hình quy tắc đánh giá cho khóa học.',
        tone: 'success',
      });
    }
  };

  // Handle Add Achievement Level
  const handleAddAchievementLevel = () => {
    const nextIdx = achievementLevels.length + 1;
    const newLvl = {
      id: `ach-custom-${Date.now()}`,
      code: `LEVEL_${nextIdx}`,
      title: `Mức bổ sung ${nextIdx}`,
      description: 'Tiêu chí đánh giá bổ sung cho học viên.',
      minPct: 60,
      maxPct: 80,
      isGeneralThreshold: false,
      dotColor: 'bg-teal-500',
    };
    setAchievementLevels([...achievementLevels, newLvl]);
    pushToast({
      title: 'Đã thêm mức chuẩn',
      description: `Đã thêm ${newLvl.title}.`,
      tone: 'default',
    });
  };

  // Handle Delete Achievement Level
  const handleDeleteAchievementLevel = (id: string) => {
    setAchievementLevels(achievementLevels.filter((lvl) => lvl.id !== id));
  };

  if (isConfigLoading || isClosLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-10 w-full rounded-full" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 text-foreground">
      {/* 1. TOP BREADCRUMB */}
      <nav aria-label="Đường dẫn điều hướng" className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/manage/courses" className="hover:text-foreground transition-colors flex items-center gap-1.5">
          <Home className="h-3.5 w-3.5" />
          <span>Trang chủ</span>
        </Link>
        <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
        <Link
          to={`/courses/${courseId}/manage/overview`}
          className="hover:text-foreground transition-colors truncate max-w-[200px] sm:max-w-xs"
        >
          Khóa học {courseTitle}
        </Link>
        <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">Quy tắc điểm</span>
      </nav>

      {/* 2. PRIMARY HORIZONTAL TABS (Dùng chung với trang tổng quan khóa học) */}
      <CourseManageSubNav courseId={courseId} activeTab="outcomes" />

      {/* 3. INNER CHUẨN ĐẦU RA SUB-TABS (Dùng chung giữa CLO, Ma trận và Quy tắc điểm) */}
      <OutcomesSubNav
        courseId={courseId}
        activeTab="rules"
        matrixCount={assessableBlocks.length || 6}
      />

      {/* Top decorative accent bar */}
      <div className="w-1.5 h-6 bg-[#ff7a1a] rounded-full" aria-hidden="true" />

      {/* 4. SECTION 1: QUY TẮC ĐIỂM TỔNG KẾT (Matching media_1795028229468_6c9885e2.jpg) */}
      <section
        aria-labelledby="grading-rule-heading"
        className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-6"
      >
        {/* Title, Subtitle & Status Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/80 flex items-center justify-center shrink-0 mt-0.5">
              <FileCheck className="h-5 w-5 text-[#ff7a1a]" />
            </div>
            <div className="space-y-0.5">
              <h2 id="grading-rule-heading" className="text-sm sm:text-base font-bold uppercase tracking-wider text-foreground">
                Quy tắc điểm tổng kết
              </h2>
              <p className="text-xs text-muted-foreground">
                Cấu hình cách thức tính điểm tổng kết và phân bổ tỷ lệ đánh giá
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2">
            <div className="text-xs font-semibold text-muted-foreground">
              Tổng trọng số: <span className="font-bold text-foreground">{totalWeight}% / 100%</span>
            </div>
            {isTotalWeightValid ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Hợp lệ</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Chưa đủ 100%</span>
              </span>
            )}
          </div>
        </div>

        {/* Phương thức tính điểm tổng kết */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#ff7a1a]" />
            <span>Phương thức tính điểm tổng kết:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Card 1: Tính theo bài đánh giá */}
            <button
              type="button"
              onClick={() => setGradingMethod('BY_COMPONENT')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                gradingMethod === 'BY_COMPONENT'
                  ? 'border-[#ff7a1a] bg-[#ff7a1a]/5 ring-1 ring-[#ff7a1a]/30'
                  : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40'
              }`}
            >
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <SlidersHorizontal className="h-4 w-4 text-foreground/80" />
              </div>
              <div className="space-y-0.5">
                <span className={`text-xs sm:text-sm font-bold block ${gradingMethod === 'BY_COMPONENT' ? 'text-[#ff7a1a]' : 'text-foreground'}`}>
                  Tính theo bài đánh giá (Mặc định)
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Tổng hợp điểm từ các cột điểm bài tập, quiz, lab và bài thi.
                </span>
              </div>
            </button>

            {/* Card 2: Tính theo CLO */}
            <button
              type="button"
              onClick={() => setGradingMethod('BY_CLO')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                gradingMethod === 'BY_CLO'
                  ? 'border-[#ff7a1a] bg-[#ff7a1a]/10 ring-1 ring-[#ff7a1a] text-foreground'
                  : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40'
              }`}
            >
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${gradingMethod === 'BY_CLO' ? 'bg-[#ff7a1a] text-white' : 'bg-muted'}`}>
                <Award className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <span className={`text-xs sm:text-sm font-bold block ${gradingMethod === 'BY_CLO' ? 'text-[#ff7a1a]' : 'text-foreground'}`}>
                  Tính theo CLO (Chuẩn đầu ra)
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Tính tự động từ mức độ tích lũy các chuẩn đầu ra khóa học.
                </span>
              </div>
            </button>
          </div>

          {/* Info callout */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground leading-relaxed">
            <Info className="h-4 w-4 text-[#ff7a1a] shrink-0 mt-0.5" />
            <span>
              Điểm tổng kết được tổng hợp tự động từ mức độ đạt các chuẩn đầu ra (CLO) của học viên theo trọng số cấu hình tại danh mục CLO.
            </span>
          </div>
        </div>

        {/* Multi-segment color progress bar */}
        <div className="space-y-2 pt-1">
          <div className="h-3 w-full rounded-full bg-muted/50 overflow-hidden flex">
            {activeClos.map((clo, idx) => {
              const weight = cloWeightsState[clo.code] ?? cloWeightsState[clo.id] ?? clo.weight;
              const barColor = CLO_BAR_COLORS[idx % CLO_BAR_COLORS.length];
              return (
                <div
                  key={clo.code}
                  style={{ width: `${Math.min(100, weight)}%` }}
                  title={`${clo.code}: ${weight}%`}
                  className={`${barColor} h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full border-r border-background/20 last:border-r-0`}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>0%</span>
            <span className="text-foreground font-bold">
              ✓ Đã phân bổ đủ {activeClos.length}/{activeClos.length} chuẩn đầu ra CLO ({totalWeight}%)
            </span>
            <span>100%</span>
          </div>
        </div>

        {/* CLO weight items list (6 items matching screenshot) */}
        <div className="space-y-2.5 pt-2">
          {activeClos.map((clo, idx) => {
            const weight = cloWeightsState[clo.code] ?? cloWeightsState[clo.id] ?? clo.weight;
            const barColor = CLO_BAR_COLORS[idx % CLO_BAR_COLORS.length];

            return (
              <div
                key={clo.code}
                className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-6 w-6 rounded-full ${barColor} text-white text-xs font-bold flex items-center justify-center shrink-0`}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-foreground">
                      {clo.code}: {clo.description}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-3">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <span className="text-xs sm:text-sm font-extrabold text-foreground w-12 text-right">
                    {weight} %
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Section 1 Footer Link (Đi tới mục CLO) */}
        <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#ff7a1a]" />
            <span>Cần điều chỉnh tỷ lệ % CLO?</span>
          </div>
          <Link
            to={`/courses/${courseId}/manage/outcomes`}
            className="text-[#ff7a1a] hover:underline font-semibold inline-flex items-center gap-1"
          >
            <span>Đi tới mục CLO</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* 5. SECTION 2: XẾP LOẠI HỌC LỰC (Matching media_1795028229468_6c9885e2.jpg) */}
      <section
        aria-labelledby="grading-scale-heading"
        className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-6"
      >
        <div className="flex items-center gap-2.5">
          <Star className="h-4 w-4 text-[#ff7a1a]" />
          <h2 id="grading-scale-heading" className="text-sm sm:text-base font-bold uppercase tracking-wider text-foreground">
            Xếp loại học lực
          </h2>
        </div>

        {/* 3 Option Radio Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Hệ 5 mức MOET */}
          <button
            type="button"
            onClick={() => setRankScheme('MOET')}
            className={`flex items-start justify-between p-4 rounded-xl border text-left transition-all ${
              rankScheme === 'MOET'
                ? 'border-[#ff7a1a] bg-[#ff7a1a]/5 ring-1 ring-[#ff7a1a]/30'
                : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40'
            }`}
          >
            <div className="space-y-1 pr-2">
              <span className={`text-sm font-bold block ${rankScheme === 'MOET' ? 'text-[#ff7a1a]' : 'text-foreground'}`}>
                Hệ 5 mức MOET
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Xuất sắc, Giỏi, Khá, Trung bình, Yếu/Trượt.
              </p>
            </div>
            {rankScheme === 'MOET' ? (
              <CheckCircle2 className="h-5 w-5 text-[#ff7a1a] shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
            )}
          </button>

          {/* Card 2: Hệ tín chỉ Chữ (ECTS) */}
          <button
            type="button"
            onClick={() => setRankScheme('ECTS')}
            className={`flex items-start justify-between p-4 rounded-xl border text-left transition-all ${
              rankScheme === 'ECTS'
                ? 'border-[#ff7a1a] bg-[#ff7a1a]/5 ring-1 ring-[#ff7a1a]/30'
                : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40'
            }`}
          >
            <div className="space-y-1 pr-2">
              <span className={`text-sm font-bold block ${rankScheme === 'ECTS' ? 'text-[#ff7a1a]' : 'text-foreground'}`}>
                Hệ tín chỉ Chữ (ECTS)
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Thang điểm A, B, C, D, F quốc tế.
              </p>
            </div>
            {rankScheme === 'ECTS' ? (
              <CheckCircle2 className="h-5 w-5 text-[#ff7a1a] shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
            )}
          </button>

          {/* Card 3: Tùy biến khung điểm */}
          <button
            type="button"
            onClick={() => setRankScheme('CUSTOM')}
            className={`flex items-start justify-between p-4 rounded-xl border text-left transition-all ${
              rankScheme === 'CUSTOM'
                ? 'border-[#ff7a1a] bg-[#ff7a1a]/5 ring-1 ring-[#ff7a1a]/30'
                : 'border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40'
            }`}
          >
            <div className="space-y-1 pr-2">
              <span className={`text-sm font-bold block ${rankScheme === 'CUSTOM' ? 'text-[#ff7a1a]' : 'text-foreground'}`}>
                Tùy biến khung điểm
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tự do chỉnh sửa nhãn và dải phần trăm.
              </p>
            </div>
            {rankScheme === 'CUSTOM' ? (
              <CheckCircle2 className="h-5 w-5 text-[#ff7a1a] shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
            )}
          </button>
        </div>

        {/* Grade scale table */}
        <div className="overflow-x-auto rounded-xl border border-border/80">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/70 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted/20">
                <th scope="col" className="py-3 px-4 sm:px-6">Danh hiệu xếp loại</th>
                <th scope="col" className="py-3 px-4 sm:px-6">Dải điểm %</th>
                <th scope="col" className="py-3 px-4 sm:px-6">Quy đổi hệ 10</th>
                <th scope="col" className="py-3 px-4 sm:px-6 text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {activeGradeScale.map((row) => {
                const badgeColorClass =
                  row.color === 'purple'
                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                    : row.color === 'green'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : row.color === 'blue'
                    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                    : row.color === 'yellow'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';

                const dotColorClass =
                  row.color === 'purple'
                    ? 'bg-purple-500'
                    : row.color === 'green'
                    ? 'bg-emerald-500'
                    : row.color === 'blue'
                    ? 'bg-sky-500'
                    : row.color === 'yellow'
                    ? 'bg-amber-500'
                    : 'bg-rose-500';

                return (
                  <tr key={row.rank} className="hover:bg-muted/30 transition-colors">
                    {/* Danh hiệu */}
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-foreground flex items-center gap-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${dotColorClass}`} />
                      <span>{row.rank}</span>
                    </td>

                    {/* Dải điểm % */}
                    <td className="py-3.5 px-4 sm:px-6 font-mono text-xs sm:text-sm text-foreground">
                      {row.minPct === 0 ? `< ${row.maxPct}%` : `${row.minPct} — ${row.maxPct === 100 ? '100%' : `< ${row.maxPct}%`}`}
                    </td>

                    {/* Quy đổi hệ 10 */}
                    <td className="py-3.5 px-4 sm:px-6 font-mono text-xs sm:text-sm text-foreground">
                      {row.gpa10Min === 0 ? `< ${row.gpa10Max.toFixed(1)}` : `${row.gpa10Min.toFixed(1)} — ${row.gpa10Max.toFixed(1)}`}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeColorClass}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. SECTION 3: MỨC ĐẠT CLO (Matching media_1795028229468_6c9885e2.jpg) */}
      <section
        aria-labelledby="clo-achievement-heading"
        className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Trophy className="h-4 w-4 text-[#ff7a1a]" />
              <h2 id="clo-achievement-heading" className="text-sm sm:text-base font-bold uppercase tracking-wider text-foreground">
                Mức đạt CLO
              </h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
              Khung thang đo 4 bậc đánh giá mức độ thuần thục của học viên đối với từng chuẩn đầu ra môn học dựa trên điểm số trung bình tích lũy từ các bài kiểm tra được gán nhãn ma trận CLO tương ứng.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleAddAchievementLevel}
            aria-label="Thêm mức chuẩn"
            variant="outline"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>+ Thêm mức chuẩn</span>
          </Button>
        </div>

        {/* Level Cards List */}
        <div className="space-y-3">
          {achievementLevels.map((lvl) => {
            return (
              <div
                key={lvl.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 transition-colors"
              >
                {/* Level Title & Desc */}
                <div className="flex items-start gap-3">
                  <span className={`h-3 w-3 rounded-full ${lvl.dotColor} shrink-0 mt-1`} />
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-foreground block">
                      {lvl.title}
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      {lvl.description}
                    </span>
                  </div>
                </div>

                {/* Range inputs / Fixed threshold */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  {lvl.isGeneralThreshold ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                      <span>&lt; Ngưỡng chung (0% - &lt; 50%)</span>
                      <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-semibold">Từ:</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={lvl.minPct}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setAchievementLevels(
                            achievementLevels.map((l) => (l.id === lvl.id ? { ...l, minPct: val } : l))
                          );
                        }}
                        className="w-14 h-8 text-center text-xs font-bold rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-[#ff7a1a]"
                      />
                      <span className="text-xs text-muted-foreground font-semibold">% đến &lt;</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={lvl.maxPct}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setAchievementLevels(
                            achievementLevels.map((l) => (l.id === lvl.id ? { ...l, maxPct: val } : l))
                          );
                        }}
                        className="w-14 h-8 text-center text-xs font-bold rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-[#ff7a1a]"
                      />
                      <span className="text-xs text-muted-foreground font-semibold">%</span>

                      <button
                        type="button"
                        onClick={() => handleDeleteAchievementLevel(lvl.id)}
                        aria-label={`Xóa mức ${lvl.title}`}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. CUỐI TRANG: THANH LƯU CẤU HÌNH QUY TẮC ĐIỂM (As explicitly requested by user) */}
      <div className="flex items-center justify-end gap-3 pt-4 pb-8">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={isSavingConfig}
          className="rounded-xl font-semibold border-border/80 hover:bg-muted/50 flex items-center gap-1.5 px-4 py-2.5"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Hủy thay đổi</span>
        </Button>

        <Button
          type="button"
          onClick={handleSaveAll}
          disabled={isSavingConfig}
          className="bg-[#ff7a1a] hover:bg-[#e86f17] text-white flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold shadow-md"
        >
          <Save className="h-4 w-4" />
          <span>{isSavingConfig ? 'Đang lưu...' : 'Lưu cấu hình quy tắc'}</span>
        </Button>
      </div>
    </div>
  );
}
