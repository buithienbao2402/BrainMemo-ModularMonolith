import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Settings,
  Save,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Info,
  Layers,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import {
  useAssessmentConfig,
  useUpdateAssessmentConfig,
  useAssessableBlocks,
  useUpsertComponent,
  type ComponentDto,
} from '../api/assessmentApi';

export function AssessmentConfigPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();

  const { data: config, isLoading: isConfigLoading } = useAssessmentConfig(courseId);
  const { mutateAsync: updateConfig, isPending: isUpdatingConfig } =
    useUpdateAssessmentConfig(courseId);

  const { data: assessableBlocks = [], isLoading: isBlocksLoading } =
    useAssessableBlocks(courseId);

  const [passThreshold, setPassThreshold] = useState<number>(5.0);
  const [scoreSelectionRule, setScoreSelectionRule] = useState<'HIGHEST' | 'LATEST' | 'AVERAGE'>('HIGHEST');
  const [ploEnabled, setPloEnabled] = useState<boolean>(false);

  // Local state for component weights map: blockId -> weight
  const [componentWeights, setComponentWeights] = useState<Record<string, number>>({});
  const [componentActive, setComponentActive] = useState<Record<string, boolean>>({});

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (config) {
      setPassThreshold(config.passThreshold ?? 5.0);
      setScoreSelectionRule(config.scoreSelectionRule || 'HIGHEST');
      setPloEnabled(config.ploEnabled ?? false);
    }
  }, [config]);

  useEffect(() => {
    if (assessableBlocks.length > 0) {
      const weights: Record<string, number> = {};
      const active: Record<string, boolean> = {};

      assessableBlocks.forEach((b) => {
        weights[b.blockId] = b.courseWeight ?? 0;
        active[b.blockId] = b.isComponent;
      });

      setComponentWeights(weights);
      setComponentActive(active);
    }
  }, [assessableBlocks]);

  const upsertComponentMutation = useUpsertComponent(courseId, '');

  const totalWeight = Object.entries(componentActive).reduce((sum, [blockId, isActive]) => {
    if (isActive) {
      return sum + (componentWeights[blockId] || 0);
    }
    return sum;
  }, 0);

  const handleSaveAll = async () => {
    setNotice(null);
    try {
      // 1. Update general assessment config
      await updateConfig({
        passThreshold,
        scoreSelectionRule,
        ploEnabled,
      });

      // 2. Update components
      for (const block of assessableBlocks) {
        const isActive = componentActive[block.blockId];
        const weight = componentWeights[block.blockId] || 0;

        if (isActive) {
          await upsertComponentMutation.mutateAsync({
            courseWeight: weight,
          });
        }
      }

      setNotice({
        type: 'success',
        message: 'Đã lưu cấu hình đánh giá và trọng số thành phần thành công!',
      });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setNotice({
        type: 'error',
        message: 'Có lỗi xảy ra khi lưu cấu hình. Vui lòng kiểm tra lại!',
      });
    }
  };

  const isLoading = isConfigLoading || isBlocksLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link
                to={`/courses/${courseId}`}
                className="hover:text-foreground inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Khóa học
              </Link>
              <span>/</span>
              <span>Đánh giá</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Settings className="w-6 h-6 text-primary" />
              Cấu hình đánh giá & Quy tắc tính điểm
            </h1>
            <p className="text-sm text-muted-foreground">
              Thiết lập quy tắc chọn điểm bài thi nhiều lần, ngưỡng đạt và phân bổ trọng số điểm thành phần.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to={`/courses/${courseId}/manage/gradebook`}>
              <Button variant="outline" size="sm">
                Xem sổ điểm
              </Button>
            </Link>
            <Button
              onClick={handleSaveAll}
              disabled={isUpdatingConfig}
              size="sm"
              className="gap-1.5"
            >
              <Save className="w-4 h-4" />
              {isUpdatingConfig ? 'Đang lưu...' : 'Lưu cấu hình'}
            </Button>
          </div>
        </div>

        {notice && (
          <div
            className={`p-4 rounded-lg text-sm border flex items-center gap-2 ${
              notice.type === 'success'
                ? 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20'
                : 'bg-destructive/10 text-destructive border-destructive/20'
            }`}
          >
            {notice.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            {notice.message}
          </div>
        )}

        {/* Evaluation Rules Section */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Info className="w-5 h-5 text-primary" />
            Quy tắc đánh giá chung (DEC-11, DEC-13)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Ngưỡng đạt khóa học (Thang điểm 10)
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Học viên đạt điểm tổng kết lớn hơn hoặc bằng ngưỡng này sẽ được coi là ĐẠT.
              </p>
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={passThreshold}
                onChange={(e) => setPassThreshold(parseFloat(e.target.value) || 0)}
                className="w-full sm:w-48 px-3 py-2 border border-border rounded bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Chuẩn đầu ra PLO (Chương trình đào tạo)
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Bật theo dõi liên kết chuẩn đầu ra cấp chương trình đào tạo.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="ploCheckbox"
                  checked={ploEnabled}
                  onChange={(e) => setPloEnabled(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="ploCheckbox" className="text-sm text-foreground">
                  Kích hoạt tính toán PLO
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Quy tắc chọn điểm khi học viên làm bài nhiều lần
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Quy tắc này quyết định điểm thành phần nào được lấy làm điểm chính thức vào sổ điểm.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`p-4 rounded-lg border cursor-pointer transition-colors flex flex-col justify-between ${
                  scoreSelectionRule === 'HIGHEST'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    name="scoreSelectionRule"
                    value="HIGHEST"
                    checked={scoreSelectionRule === 'HIGHEST'}
                    onChange={() => setScoreSelectionRule('HIGHEST')}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="font-semibold text-sm text-foreground">Điểm cao nhất</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  (HIGHEST) Khuyến khích học viên làm bài nhiều lần để đạt kết quả tốt nhất.
                </span>
              </label>

              <label
                className={`p-4 rounded-lg border cursor-pointer transition-colors flex flex-col justify-between ${
                  scoreSelectionRule === 'LATEST'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    name="scoreSelectionRule"
                    value="LATEST"
                    checked={scoreSelectionRule === 'LATEST'}
                    onChange={() => setScoreSelectionRule('LATEST')}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="font-semibold text-sm text-foreground">Lần nộp gần nhất</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  (LATEST) Phù hợp với bài đánh giá kiểm tra tiến độ học hiện tại.
                </span>
              </label>

              <label
                className={`p-4 rounded-lg border cursor-pointer transition-colors flex flex-col justify-between ${
                  scoreSelectionRule === 'AVERAGE'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    name="scoreSelectionRule"
                    value="AVERAGE"
                    checked={scoreSelectionRule === 'AVERAGE'}
                    onChange={() => setScoreSelectionRule('AVERAGE')}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="font-semibold text-sm text-foreground">Trung bình các lần</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  (AVERAGE) Đánh giá sự ổn định và nỗ lực qua tất cả các lần thực hiện.
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Component Weight Allocation */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Phân bổ trọng số điểm thành phần
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chọn các bài kiểm tra hoặc bài tập nộp sẽ được tính vào sổ điểm tổng kết.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Tổng trọng số:</span>
              <span
                className={`text-sm font-bold font-mono px-2 py-0.5 rounded ${
                  totalWeight === 100
                    ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {totalWeight}%
              </span>
            </div>
          </div>

          {totalWeight !== 100 && (
            <div className="p-3 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs border border-amber-500/20 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Tổng trọng số hiện tại là {totalWeight}%. Khuyến nghị cấu hình sao cho tổng các cột điểm thành phần bằng 100%.
            </div>
          )}

          {assessableBlocks.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4">
              Khóa học chưa có bài kiểm tra (Quiz) hoặc bài tập (Assignment) nào. Hãy tạo nội dung trước khi thiết lập trọng số.
            </p>
          ) : (
            <div
              className="overflow-x-auto focus:outline-none focus:ring-1 focus:ring-primary"
              tabIndex={0}
              role="region"
              aria-label="Bảng phân bổ trọng số thành phần"
            >
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="py-3 px-4 font-semibold text-muted-foreground w-12 text-center">Bật</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground">Tên hoạt động</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground">Loại</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground">Thang điểm</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground w-36">Trọng số (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assessableBlocks.map((block: ComponentDto) => {
                    const isActive = componentActive[block.blockId] ?? false;
                    const weight = componentWeights[block.blockId] ?? 0;

                    return (
                      <tr
                        key={block.blockId}
                        className={`hover:bg-muted/30 transition-colors ${
                          !isActive ? 'opacity-60 bg-muted/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) =>
                              setComponentActive((prev) => ({
                                ...prev,
                                [block.blockId]: e.target.checked,
                              }))
                            }
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                          />
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {block.title}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {block.sourceKind}
                        </td>
                        <td className="py-3 px-4 text-sm font-mono text-muted-foreground">
                          {block.maxScore} đ
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              disabled={!isActive}
                              value={weight}
                              onChange={(e) =>
                                setComponentWeights((prev) => ({
                                  ...prev,
                                  [block.blockId]: parseFloat(e.target.value) || 0,
                                }))
                              }
                              className="w-20 px-2 py-1 text-sm border border-border rounded bg-background text-right focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-muted"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
