import { useParams, Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { useMyGradebook, type GradebookComponentItemDto } from '../api/assessmentApi';

export function LearnerGradebookPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();

  const { data: gradebook, isLoading, error } = useMyGradebook(courseId);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !gradebook) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="rounded-lg bg-destructive/10 p-6 text-destructive border border-destructive/20 text-center">
          <h2 className="text-lg font-semibold">Không thể tải sổ điểm cá nhân</h2>
          <p className="text-sm mt-1">Bạn chưa đăng ký khóa học hoặc thông tin điểm chưa sẵn sàng.</p>
          <Link to={`/courses/${courseId}`} className="mt-4 inline-block text-primary underline text-sm">
            Quay lại khóa học
          </Link>
        </div>
      </div>
    );
  }

  const hasFinalGrade = gradebook.totalGrade !== null && gradebook.totalGrade !== undefined;
  const isPassed = gradebook.allCloAchieved;

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div>
          <Link
            to={`/courses/${courseId}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Trở lại khóa học
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Award className="w-7 h-7 text-primary" />
            Kết quả học tập & Sổ điểm của bạn
          </h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi chi tiết các điểm thành phần, điểm tổng kết và mức độ hoàn thành chuẩn đầu ra.
          </p>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border border-border p-5 shadow-sm space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Điểm tổng kết (Thang 10)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-foreground">
                {hasFinalGrade ? gradebook.totalGrade?.toFixed(2) : '--'}
              </span>
              <span className="text-xs text-muted-foreground">/ 10.0</span>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-5 shadow-sm space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Xếp loại học lực
            </span>
            <div>
              <span className="text-xl font-bold text-foreground">
                {gradebook.classification || 'Đang cập nhật'}
              </span>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-5 shadow-sm space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Trạng thái hoàn thành
            </span>
            <div className="flex items-center gap-2">
              {hasFinalGrade ? (
                isPassed ? (
                  <span className="inline-flex items-center gap-1.5 text-base font-semibold text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-5 h-5" />
                    ĐẠT KHÓA HỌC
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-base font-semibold text-destructive">
                    <XCircle className="w-5 h-5" />
                    CHƯA ĐẠT
                  </span>
                )
              ) : (
                <span className="text-sm text-muted-foreground italic">Chưa hoàn tất các cột điểm</span>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Components Table */}
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-base">
              Bảng điểm các cột thành phần
            </h3>
          </div>

          <div
            className="overflow-x-auto focus:outline-none focus:ring-1 focus:ring-primary"
            tabIndex={0}
            role="region"
            aria-label="Danh sách điểm các thành phần"
          >
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="py-3 px-4 font-semibold text-muted-foreground">Nội dung đánh giá</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-center">Trọng số</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-center">Điểm cao nhất</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-center">Lần nộp gần nhất</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-center">Trung bình</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-center">Điểm ghi nhận</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground">Nhận xét</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {gradebook.components.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Khóa học chưa cấu hình các cột điểm thành phần.
                    </td>
                  </tr>
                ) : (
                  gradebook.components.map((item: GradebookComponentItemDto) => {
                    const hasFinal = item.final !== null && item.final !== undefined;
                    return (
                      <tr key={item.blockId} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          <div>
                            <div>{item.title}</div>
                            <span className="text-xs text-muted-foreground">
                              Thang điểm tối đa: {item.maxScore} đ
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-medium">
                          {item.courseWeight}%
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono text-muted-foreground">
                          {item.highest !== null && item.highest !== undefined ? item.highest : '-'}
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono text-muted-foreground">
                          {item.latest !== null && item.latest !== undefined ? item.latest : '-'}
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono text-muted-foreground">
                          {item.average !== null && item.average !== undefined ? item.average.toFixed(1) : '-'}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {hasFinal ? (
                            <span className="font-bold text-base font-mono text-primary">
                              {item.final}
                            </span>
                          ) : item.status === 'PENDING_MANUAL' ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-medium">
                              <Clock className="w-3 h-3" />
                              Chờ chấm
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">Chưa làm</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-muted-foreground max-w-xs truncate">
                          {item.feedback ? (
                            <span title={item.feedback}>{item.feedback}</span>
                          ) : (
                            <span className="italic">Không có nhận xét</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
