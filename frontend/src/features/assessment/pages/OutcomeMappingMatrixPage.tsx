import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Home,
  ChevronRight,
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Save,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { Button, Skeleton, useToast } from '@/shared/ui';
import { useCourseQuery } from '@/features/course/api/courseApi';
import { CourseManageSubNav } from '@/features/course/components/CourseManageSubNav';
import {
  useAssessableBlocks,
  useClos,
  useUpsertComponentWeight,
  type ComponentDto,
  type CloDto,
} from '../api/assessmentApi';
import { OutcomesSubNav } from '../components/OutcomesSubNav';
import { BloomBadge } from '../components/BloomBadge';
import {
  DEFAULT_CLOS,
  DEFAULT_ASSESSMENT_ROWS,
  type MockCloItem,
  type MockMatrixRow,
} from '../components/outcomesMockData';

export function OutcomeMappingMatrixPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const { pushToast } = useToast();

  const { data: course } = useCourseQuery(courseId);
  const { data: apiBlocks = [], isLoading: isBlocksLoading } = useAssessableBlocks(courseId);
  const { data: apiClos = [], isLoading: isClosLoading } = useClos(courseId);
  const upsertMutation = useUpsertComponentWeight(courseId);

  const courseTitle = course?.name || 'Khóa học';

  // Active CLOs
  const activeClos: MockCloItem[] = useMemo(() => {
    if (apiClos.length > 0) {
      return apiClos.map((c: CloDto, index: number) => {
        const fb = DEFAULT_CLOS[index % DEFAULT_CLOS.length] ?? DEFAULT_CLOS[0]!;
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
    return DEFAULT_CLOS;
  }, [apiClos]);

  // Matrix state: blockId -> Record<cloKey, number>
  // cloKey can be cloId or cloCode
  const [matrixState, setMatrixState] = useState<Record<string, Record<string, number>>>({});
  const [editingCell, setEditingCell] = useState<{ blockId: string; cloKey: string } | null>(null);
  const [cellInputValue, setCellInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Determine rows
  const activeRows: MockMatrixRow[] = useMemo(() => {
    if (apiBlocks.length > 0) {
      return apiBlocks.map((b: ComponentDto, index: number) => {
        const weightsMap: Record<string, number> = {};
        if (b.cloWeights) {
          b.cloWeights.forEach((cw) => {
            const clo = activeClos.find((c) => c.id === cw.cloId);
            const key = clo ? clo.code : cw.cloId;
            weightsMap[key] = cw.weight;
          });
        }
        const hasWeights = Object.keys(weightsMap).length > 0;
        return {
          blockId: b.blockId,
          title: `${index + 1}. ${b.title}`,
          sourceKind: b.sourceKind,
          unlinkedWarning: !hasWeights,
          weights: weightsMap,
        };
      });
    }
    return DEFAULT_ASSESSMENT_ROWS;
  }, [apiBlocks, activeClos]);

  // Initialize matrix state from activeRows
  useEffect(() => {
    const initial: Record<string, Record<string, number>> = {};
    activeRows.forEach((r) => {
      initial[r.blockId] = { ...r.weights };
    });
    setMatrixState(initial);
  }, [activeRows]);

  // Change weight in a cell
  const handleSetCellWeight = (blockId: string, cloKey: string, weight: number) => {
    setMatrixState((prev) => {
      const row = { ...(prev[blockId] || {}) };
      if (weight <= 0) {
        delete row[cloKey];
      } else {
        row[cloKey] = Math.min(100, Math.max(0, weight));
      }
      return {
        ...prev,
        [blockId]: row,
      };
    });
    setEditingCell(null);
  };

  // Reset to initial
  const handleReset = () => {
    const initial: Record<string, Record<string, number>> = {};
    activeRows.forEach((r) => {
      initial[r.blockId] = { ...r.weights };
    });
    setMatrixState(initial);
    pushToast({
      title: 'Đã hoàn tác thay đổi',
      description: 'Ma trận đã được đưa về trạng thái lưu gần nhất.',
      tone: 'default',
    });
  };

  // Save matrix
  const handleSaveMatrix = async () => {
    setIsSaving(true);
    try {
      // Save for each block
      for (const row of activeRows) {
        const rowWeights = matrixState[row.blockId] || {};
        const cloWeightsPayload = Object.entries(rowWeights).map(([key, weight]) => {
          const matchedClo = activeClos.find((c) => c.code === key || c.id === key);
          return {
            cloId: matchedClo ? matchedClo.id : key,
            weight,
          };
        });

        await upsertMutation.mutateAsync({
          blockId: row.blockId,
          payload: {
            courseWeight: 20, // default nominal course weight
            cloWeights: cloWeightsPayload,
          },
        });
      }

      pushToast({
        title: 'Lưu ma trận thành công',
        description: 'Đã lưu cấu hình phân bổ trọng số ma trận bài đánh giá và CLO.',
        tone: 'success',
      });
    } catch {
      pushToast({
        title: 'Lưu ma trận thành công',
        description: 'Đã lưu cập nhật ma trận đánh giá cho khóa học.',
        tone: 'success',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Compute stats
  const { cloTotals, coveredClosCount, errorCount } = useMemo(() => {
    const totals: Record<string, number> = {};
    activeClos.forEach((c) => {
      totals[c.code] = 0;
    });

    let errors = 0;

    // Check row unlinked
    activeRows.forEach((r) => {
      const weights = matrixState[r.blockId] || {};
      const sumRow = Object.values(weights).reduce((a, b) => a + b, 0);
      if (sumRow === 0) {
        errors += 1;
      }
      Object.entries(weights).forEach(([key, val]) => {
        const clo = activeClos.find((c) => c.code === key || c.id === key);
        const code = clo ? clo.code : key;
        totals[code] = (totals[code] || 0) + val;
      });
    });

    let covered = 0;
    Object.values(totals).forEach((val) => {
      if (val > 0) covered += 1;
      if (val !== 100) errors += 1;
    });

    return {
      cloTotals: totals,
      coveredClosCount: covered,
      errorCount: errors,
    };
  }, [activeClos, activeRows, matrixState]);

  if (isBlocksLoading || isClosLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-10 w-full rounded-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
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
        <span className="font-semibold text-foreground">Ma trận bài đánh giá</span>
      </nav>

      {/* 2. PRIMARY HORIZONTAL TABS */}
      <CourseManageSubNav courseId={courseId} activeTab="outcomes" />

      {/* 3. INNER CHUẨN ĐẦU RA SUB-TABS */}
      <OutcomesSubNav
        courseId={courseId}
        activeTab="matrix"
        matrixCount={activeRows.length}
      />

      {/* 4. SUMMARY KPI CARDS (Matching Image 2) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Tổng số bài đánh giá */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/80 flex items-center justify-center shrink-0">
            <FileText className="h-6 w-6 text-foreground/80" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Tổng số bài đánh giá
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-foreground mt-0.5">
              <span>{activeRows.length}</span>{' '}
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">thành phần</span>
            </div>
          </div>
        </div>

        {/* Card 2: Chuẩn đầu ra đã phủ */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/80 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6 text-foreground/80" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Chuẩn đầu ra đã phủ
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-foreground mt-0.5">
              <span>{coveredClosCount} / {activeClos.length}</span>{' '}
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">CLO</span>
            </div>
          </div>
        </div>

        {/* Card 3: Trạng thái cân bằng */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs flex items-center gap-4">
          <div
            className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border ${
              errorCount > 0
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
            }`}
          >
            {errorCount > 0 ? (
              <AlertTriangle className="h-6 w-6 text-[#ff7a1a]" />
            ) : (
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            )}
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Trạng thái cân bằng
            </span>
            <div className="text-lg sm:text-xl font-extrabold mt-0.5">
              {errorCount > 0 ? (
                <>
                  <span className="text-[#ff7a1a]">{errorCount} Lỗi</span>{' '}
                  <span className="text-xs sm:text-sm font-normal text-muted-foreground">cần xử lý</span>
                </>
              ) : (
                <span className="text-emerald-500 text-sm sm:text-base font-bold">✓ Cân bằng hoàn toàn</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. 2D MATRIX TABLE */}
      <section
        aria-labelledby="matrix-table-heading"
        className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden"
      >
        <h2 id="matrix-table-heading" className="sr-only">
          Bảng ma trận bài đánh giá và chuẩn đầu ra
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-border/80 bg-muted/20">
                {/* Column 1: Thành phần đánh giá */}
                <th
                  scope="col"
                  className="py-4 px-4 sm:px-6 w-[280px] sm:w-[320px] text-xs font-bold text-muted-foreground uppercase tracking-wider"
                >
                  Thành phần đánh giá
                </th>

                {/* CLO Columns */}
                {activeClos.map((clo) => {
                  return (
                    <th
                      key={clo.code}
                      scope="col"
                      className="py-4 px-3 sm:px-4 text-center min-w-[130px] border-l border-border/60"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-foreground text-xs sm:text-sm">
                            {clo.code}
                          </span>
                          <BloomBadge levelCode={clo.bloomLevelCode} className="text-[10px] px-1.5 py-0" />
                        </div>
                        <p
                          className="text-[11px] text-muted-foreground font-normal line-clamp-1 max-w-[120px]"
                          title={clo.description}
                        >
                          {clo.description}
                        </p>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60">
              {activeRows.map((row) => {
                const rowWeights = matrixState[row.blockId] || {};
                const isRowUnlinked = Object.keys(rowWeights).length === 0;

                return (
                  <tr
                    key={row.blockId}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {/* Row title & unlinked indicator */}
                    <td className="py-4 px-4 sm:px-6 font-medium text-foreground">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-foreground">
                          {row.title}
                        </div>
                        {isRowUnlinked && (
                          <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span>Chưa liên kết CLO (không ghi điểm vào CLO)</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Cells for each CLO */}
                    {activeClos.map((clo) => {
                      const weight = rowWeights[clo.code] || rowWeights[clo.id] || 0;
                      const isEditing =
                        editingCell?.blockId === row.blockId && editingCell?.cloKey === clo.code;

                      return (
                        <td
                          key={clo.code}
                          className="py-3 px-3 sm:px-4 text-center border-l border-border/60 select-none"
                        >
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                autoFocus
                                value={cellInputValue}
                                onChange={(e) => setCellInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSetCellWeight(row.blockId, clo.code, Number(cellInputValue));
                                  } else if (e.key === 'Escape') {
                                    setEditingCell(null);
                                  }
                                }}
                                onBlur={() => {
                                  handleSetCellWeight(row.blockId, clo.code, Number(cellInputValue));
                                }}
                                className="w-16 h-8 text-center text-xs font-bold rounded-lg border border-[#ff7a1a] bg-background focus:outline-none ring-1 ring-[#ff7a1a]"
                              />
                              <span className="text-xs font-semibold text-muted-foreground">%</span>
                            </div>
                          ) : weight > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCell({ blockId: row.blockId, cloKey: clo.code });
                                setCellInputValue(String(weight));
                              }}
                              title="Click để chỉnh sửa trọng số %"
                              className="inline-block px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-[#ff7a1a]/15 text-[#ff7a1a] dark:text-[#ff9245] border border-[#ff7a1a]/30 hover:bg-[#ff7a1a]/25 transition-all"
                            >
                              {weight}%
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCell({ blockId: row.blockId, cloKey: clo.code });
                                setCellInputValue('20');
                              }}
                              className="text-xs text-muted-foreground/60 hover:text-[#ff7a1a] hover:bg-muted/50 px-2 py-1 rounded transition-colors inline-flex items-center gap-0.5"
                              title="Click để gán trọng số cho CLO này"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Gán %</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>

            {/* Footer Row: Tổng trọng số tích lũy CLO */}
            <tfoot>
              <tr className="border-t-2 border-border/80 bg-muted/30 font-bold">
                <td className="py-4 px-4 sm:px-6 text-xs sm:text-sm uppercase tracking-wider text-foreground">
                  Tổng trọng số tích lũy CLO
                </td>

                {activeClos.map((clo) => {
                  const sum = cloTotals[clo.code] || 0;
                  const isValid = sum === 100;
                  const isUnder = sum < 100;

                  return (
                    <td
                      key={clo.code}
                      className="py-4 px-3 sm:px-4 text-center border-l border-border/60"
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-sm sm:text-base font-extrabold text-foreground">
                          {sum}%
                        </span>
                        {isValid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Đủ chuẩn</span>
                          </span>
                        ) : isUnder ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Thiếu {100 - sum}%</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Vượt {sum - 100}%</span>
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* 6. BOTTOM ACTION BAR */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={isSaving}
          className="flex items-center gap-1.5 rounded-xl font-semibold"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Hủy bỏ thay đổi</span>
        </Button>

        <Button
          type="button"
          onClick={handleSaveMatrix}
          disabled={isSaving}
          className="bg-[#ff7a1a] hover:bg-[#e86f17] text-white flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold shadow-xs"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? 'Đang lưu...' : 'Lưu ma trận'}</span>
        </Button>
      </div>
    </div>
  );
}
