import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BarChart3,
  Download,
  ArrowLeft,
  AlertOctagon,
  Award,
  Layers,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import { useToast } from '@/shared/ui/toastContext';
import {
  useAssessmentStats,
} from '../api/assessmentApi';

export function AssessmentStatsPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const { pushToast } = useToast();

  const { data: stats, isLoading, error } = useAssessmentStats(courseId);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (scope: 'GRADEBOOK' | 'CLO') => {
    setIsExporting(true);
    try {
      // Direct file download using browser fetch & blob
      const res = await fetch(`/api/v1/courses/${courseId}/assessment/export?format=xlsx&scope=${scope}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('brainmemo_auth_token') || ''}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessment_report_${scope.toLowerCase()}_${courseId.slice(0, 8)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      pushToast({
        title: 'Xuất dữ liệu thành công',
        description: `Báo cáo ${scope === 'GRADEBOOK' ? 'Bảng điểm' : 'Chuẩn đầu ra CLO'} đã được tải về.`,
        tone: 'success',
      });
    } catch (err: any) {
      pushToast({
        title: 'Lỗi xuất báo cáo',
        description: err?.message || 'Không thể tải tệp báo cáo lúc này.',
        tone: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="rounded-lg bg-destructive/10 p-6 text-destructive border border-destructive/20 text-center">
          <h2 className="text-lg font-semibold">Không thể tải dữ liệu thống kê</h2>
          <p className="text-sm mt-1">Dữ liệu đánh giá của khóa học chưa sẵn sàng hoặc đã có lỗi.</p>
          <Link to={`/courses/${courseId}`} className="mt-4 inline-block text-primary underline text-sm">
            Quay lại khóa học
          </Link>
        </div>
      </div>
    );
  }

  const { scoreDistribution = [], hardestQuestions = [], cloPassRates = [], levelDistribution = [] } = stats;

  const totalStudents = levelDistribution.reduce((acc, curr) => acc + curr.count, 0) ||
    scoreDistribution.reduce((acc, curr) => acc + curr.count, 0);

  const avgCloPassRate = cloPassRates.length > 0
    ? cloPassRates.reduce((acc, curr) => acc + curr.passRate, 0) / cloPassRates.length
    : 0;

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
              <span>Thống kê đánh giá</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-primary" />
              Thống kê kết quả đánh giá khóa học
            </h1>
            <p className="text-sm text-muted-foreground">
              Phân bố phổ điểm học viên, tỷ lệ đạt Chuẩn đầu ra (CLO) và phân tích các câu hỏi có tỷ lệ làm sai cao.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('GRADEBOOK')}
              disabled={isExporting}
              className="gap-1.5"
            >
              <Download className="w-4 h-4" />
              Xuất bảng điểm (CSV)
            </Button>
            <Button
              size="sm"
              onClick={() => handleExport('CLO')}
              disabled={isExporting}
              className="gap-1.5"
            >
              <Download className="w-4 h-4" />
              Xuất CLO (CSV)
            </Button>
          </div>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tổng số học viên đánh giá
            </span>
            <div className="text-3xl font-extrabold text-foreground">
              {totalStudents.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Đã có lượt nộp bài hoặc điểm số ghi nhận</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tỷ lệ đạt chuẩn đầu ra trung bình
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-primary">
                {avgCloPassRate.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">toàn khóa</span>
            </div>
            <p className="text-xs text-muted-foreground">Dựa trên {cloPassRates.length} chuẩn CLO đã liên kết</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Câu hỏi cần cải thiện
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                {hardestQuestions.length}
              </span>
              <span className="text-xs text-muted-foreground">câu hỏi</span>
            </div>
            <p className="text-xs text-muted-foreground">Có tỷ lệ làm sai trên 30%</p>
          </div>
        </div>

        {/* Section 1: Score Distribution (Histogram) */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Phổ điểm học viên (Thang điểm 10)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Phân bổ số lượng và tỷ lệ % học viên theo từng khoảng điểm tổng kết
              </p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 pt-4">
            {scoreDistribution.map((range) => {
              const maxPct = Math.max(...scoreDistribution.map((d) => d.percentage), 10);
              const heightPct = Math.max(12, (range.percentage / maxPct) * 100);

              let barBg = 'bg-primary/70';
              if (range.maxScore <= 4) barBg = 'bg-destructive/80';
              else if (range.maxScore <= 6) barBg = 'bg-amber-500/80';
              else if (range.minScore >= 8) barBg = 'bg-emerald-500/80';

              return (
                <div key={range.rangeLabel} className="flex flex-col items-center gap-2">
                  <div className="w-full h-40 bg-muted/30 rounded-lg p-2 flex flex-col justify-end items-center relative overflow-hidden">
                    <span className="text-xs font-bold text-foreground mb-1 z-10">
                      {range.count} hv ({range.percentage.toFixed(0)}%)
                    </span>
                    <div
                      className={`w-full rounded-md transition-all duration-500 ${barBg}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-semibold text-muted-foreground text-center">
                    {range.rangeLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: CLO Pass Rates */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              Mức độ đạt từng Chuẩn đầu ra (CLO Pass Rates)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tỷ lệ phần trăm học viên đạt chuẩn (ngưỡng quy định tối thiểu 50%)
            </p>
          </div>

          {cloPassRates.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Chưa có dữ liệu chuẩn đầu ra để thống kê.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {cloPassRates.map((clo) => {
                const isPassed = clo.passRate >= 50;
                return (
                  <div key={clo.cloId} className="border border-border rounded-lg p-4 bg-muted/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary text-sm">{clo.code}</span>
                        {clo.bloomLevelCode && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">
                            {clo.bloomLevelCode}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-extrabold text-foreground font-mono">
                        {clo.passRate.toFixed(1)}%
                      </span>
                    </div>

                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isPassed ? 'bg-primary' : 'bg-destructive'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, clo.passRate))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span>Đạt: {clo.passedStudents} / {clo.totalStudents} học viên</span>
                      <span className={isPassed ? 'text-emerald-600 font-semibold' : 'text-destructive font-semibold'}>
                        {isPassed ? 'ĐẠT CHUẨN' : 'CHƯA ĐẠT'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 3: Hardest Questions Analysis */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-semibold text-foreground">
                Phân tích câu hỏi hay làm sai nhất (Hardest Questions)
              </h2>
            </div>
          </div>

          {hardestQuestions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Chưa phát hiện câu hỏi nào có tỷ lệ làm sai cao bất thường.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="py-3 px-4 font-semibold text-muted-foreground">Nội dung câu hỏi</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground w-28">Loại</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground text-center w-28">Lượt làm</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground text-center w-28">Điểm TB</th>
                    <th className="py-3 px-4 font-semibold text-muted-foreground text-center w-28">Tỷ lệ sai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {hardestQuestions.map((q) => (
                    <tr key={q.questionId} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-foreground max-w-md">
                        <div className="line-clamp-2">{q.stem}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {q.questionType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-muted-foreground">
                        {q.totalAttempts}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs font-semibold text-foreground">
                        {q.averageScore.toFixed(1)} / {q.maxPoints}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full font-mono">
                          {q.errorRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 4: Level Distribution (Classification) */}
        {levelDistribution.length > 0 && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Phân phối xếp loại học lực toàn khóa
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {levelDistribution.map((lvl) => (
                <div key={lvl.classification} className="border border-border rounded-lg p-3 text-center bg-muted/10 space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground block">{lvl.classification}</span>
                  <div className="text-xl font-extrabold text-foreground">{lvl.count}</div>
                  <span className="text-[11px] text-muted-foreground">{lvl.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
