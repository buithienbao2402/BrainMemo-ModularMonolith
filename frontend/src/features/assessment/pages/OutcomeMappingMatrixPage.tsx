import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Grid,
  Save,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { Button, Input } from '@/shared/ui';
import { useToast } from '@/shared/ui/toastContext';
import {
  useAssessableBlocks,
  useClos,
  useUpsertComponentWeight,
  type ComponentDto,
} from '../api/assessmentApi';

export function OutcomeMappingMatrixPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const { pushToast } = useToast();

  const { data: assessableBlocks = [], isLoading: isBlocksLoading } = useAssessableBlocks(courseId);
  const { data: clos = [], isLoading: isClosLoading } = useClos(courseId);

  const upsertMutation = useUpsertComponentWeight(courseId);

  // Matrix state: blockId -> { courseWeight: number, cloWeights: Record<string, number> }
  const [matrixState, setMatrixState] = useState<
    Record<string, { courseWeight: number; cloWeights: Record<string, number> }>
  >({});

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (assessableBlocks.length > 0) {
      const initial: Record<string, { courseWeight: number; cloWeights: Record<string, number> }> = {};

      assessableBlocks.forEach((block: ComponentDto) => {
        const cloMap: Record<string, number> = {};
        if (block.cloWeights) {
          block.cloWeights.forEach((cw) => {
            cloMap[cw.cloId] = cw.weight;
          });
        }
        initial[block.blockId] = {
          courseWeight: block.courseWeight ?? 0,
          cloWeights: cloMap,
        };
      });

      setMatrixState(initial);
    }
  }, [assessableBlocks]);

  const handleCellChange = (blockId: string, cloId: string, val: string) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setMatrixState((prev) => {
      const existing = prev[blockId] || { courseWeight: 0, cloWeights: {} };
      return {
        ...prev,
        [blockId]: {
          ...existing,
          cloWeights: {
            ...existing.cloWeights,
            [cloId]: num,
          },
        },
      };
    });
  };

  const handleCourseWeightChange = (blockId: string, val: string) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setMatrixState((prev) => {
      const existing = prev[blockId] || { courseWeight: 0, cloWeights: {} };
      return {
        ...prev,
        [blockId]: {
          ...existing,
          courseWeight: num,
        },
      };
    });
  };

  // Calculate sum of course weights
  const totalCourseWeight = Object.values(matrixState).reduce(
    (acc, curr) => acc + (curr.courseWeight || 0),
    0
  );

  const isWeightValid = Math.abs(totalCourseWeight - 100) < 0.01;

  const handleSaveMatrix = async () => {
    setIsSaving(true);
    try {
      for (const block of assessableBlocks) {
        const item = matrixState[block.blockId];
        if (!item) continue;

        const cloWeightsArray = Object.entries(item.cloWeights || {})
          .filter(([_, w]) => w > 0)
          .map(([cloId, weight]) => ({ cloId, weight }));

        // Use custom mutation endpoint per blockId
        await upsertMutation.mutateAsync({
          blockId: block.blockId,
          payload: {
            courseWeight: item.courseWeight,
            cloWeights: cloWeightsArray,
          },
        });
      }

      pushToast({
        title: 'Thành công',
        description: 'Đã lưu ma trận ánh xạ chuẩn đầu ra thành công!',
        tone: 'success',
      });
    } catch (err: any) {
      pushToast({
        title: 'Lỗi lưu ma trận',
        description: err?.message || 'Có lỗi xảy ra khi lưu ma trận ánh xạ.',
        tone: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isBlocksLoading || isClosLoading;

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link
                to={`/courses/${courseId}/manage/outcomes`}
                className="hover:text-foreground inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Chuẩn đầu ra
              </Link>
              <span>/</span>
              <span>Ma trận bài đánh giá</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Grid className="w-7 h-7 text-primary" />
              Ma trận bài đánh giá và Chuẩn đầu ra (CLO Mapping)
            </h1>
            <p className="text-sm text-muted-foreground">
              Phân bổ trọng số % đóng góp của từng bài kiểm tra, bài tập lớn vào các Chuẩn đầu ra học phần.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to={`/courses/${courseId}/manage/outcomes`}>
              <Button variant="outline" className="gap-2">
                <Layers className="w-4 h-4" />
                Quản lý CLO/PLO
              </Button>
            </Link>
            <Button onClick={handleSaveMatrix} disabled={isSaving} className="gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? 'Đang lưu...' : 'Lưu ma trận'}
            </Button>
          </div>
        </div>

        {/* Soft Warning Banner (Rule: Cảnh báo tổng trọng số ≠ 100 nhưng không chặn) */}
        {!isWeightValid && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-sm">
              <span className="font-semibold">Cảnh báo tổng trọng số:</span> Tổng trọng số điểm thành phần hiện tại là{' '}
              <strong className="underline">{totalCourseWeight}%</strong> (khác 100%).
              <p className="text-xs text-muted-foreground mt-0.5">
                Bạn vẫn có thể lưu cấu hình này theo tiến độ thiết kế bài học; tuy nhiên điểm tổng kết khóa học sẽ chỉ chuẩn hóa chính xác khi đạt 100%.
              </p>
            </div>
          </div>
        )}

        {isWeightValid && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-sm">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Tổng trọng số các bài đánh giá đã đạt chuẩn 100%.</span>
          </div>
        )}

        {/* 2D Matrix Table */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground text-base">
              Bảng ma trận 2 chiều (Nội dung đánh giá &times; CLO)
            </h2>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Nhập % trọng số CLO cho mỗi bài đánh giá</span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : assessableBlocks.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-base font-medium">Chưa có bài đánh giá nào trong khóa học</p>
              <p className="text-xs mt-1">Hãy tạo bài kiểm tra Quiz hoặc bài tập Assignment trong phần Nội dung khóa học trước.</p>
            </div>
          ) : clos.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-base font-medium">Chưa có chuẩn đầu ra CLO</p>
              <Link to={`/courses/${courseId}/manage/outcomes`} className="text-primary underline text-sm mt-2 inline-block">
                Tạo chuẩn đầu ra CLO tại đây
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="py-3 px-4 font-semibold text-muted-foreground min-w-[240px]">
                      Nội dung đánh giá (Quiz / Bài tập)
                    </th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground text-center w-32">
                      Trọng số khóa (%)
                    </th>
                    {clos.map((clo) => (
                      <th
                        key={clo.id}
                        className="py-3 px-3 font-semibold text-center min-w-[100px] border-l border-border/50"
                        title={clo.description}
                      >
                        <div className="font-mono font-bold text-primary">{clo.code}</div>
                        <span className="text-[10px] text-muted-foreground font-normal truncate block max-w-[90px] mx-auto">
                          {clo.bloomLevelCode || ''}
                        </span>
                      </th>
                    ))}
                    <th className="py-3 px-4 font-semibold text-center text-muted-foreground w-28 border-l border-border">
                      Tổng CLO
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assessableBlocks.map((block) => {
                    const blockState = matrixState[block.blockId] || { courseWeight: 0, cloWeights: {} };
                    const rowSum = Object.values(blockState.cloWeights || {}).reduce((a, b) => a + (b || 0), 0);

                    return (
                      <tr key={block.blockId} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          <div>
                            <div className="font-semibold text-sm">{block.title}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                                {block.sourceKind}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Tối đa: {block.maxScore} đ
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={blockState.courseWeight}
                              onChange={(e) => handleCourseWeightChange(block.blockId, e.target.value)}
                              className="w-16 h-8 text-center text-xs font-semibold"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                        </td>

                        {clos.map((clo) => {
                          const weight = blockState.cloWeights[clo.id] || '';
                          return (
                            <td key={clo.id} className="py-3.5 px-2 text-center border-l border-border/50">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={5}
                                value={weight}
                                onChange={(e) => handleCellChange(block.blockId, clo.id, e.target.value)}
                                placeholder="0"
                                className="w-14 h-8 text-center text-xs mx-auto focus:ring-1 focus:ring-primary"
                              />
                            </td>
                          );
                        })}

                        <td className="py-3.5 px-4 text-center border-l border-border font-mono font-semibold text-xs">
                          <span
                            className={
                              rowSum > 0
                                ? 'text-foreground'
                                : 'text-muted-foreground italic'
                            }
                          >
                            {rowSum}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/40 border-t-2 border-border font-semibold text-xs">
                  <tr>
                    <td className="py-3 px-4 text-foreground">
                      Tổng cộng trọng số khóa học:
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-sm">
                      <span className={isWeightValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                        {totalCourseWeight}%
                      </span>
                    </td>
                    {clos.map((clo) => {
                      const colSum = assessableBlocks.reduce((acc, b) => {
                        const w = matrixState[b.blockId]?.cloWeights[clo.id] || 0;
                        return acc + w;
                      }, 0);
                      return (
                        <td key={clo.id} className="py-3 px-2 text-center border-l border-border/50 text-muted-foreground font-mono">
                          {colSum}%
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 border-l border-border" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
