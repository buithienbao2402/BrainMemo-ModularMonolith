import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  GraduationCap,
  Download,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Search,
  Settings,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import {
  useCourseGradebook,
  useAssessableBlocks,
} from '../api/assessmentApi';

export function CourseGradebookPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: gradebookList = [], isLoading, error } = useCourseGradebook(courseId);
  const { data: assessableBlocks = [] } = useAssessableBlocks(courseId);

  // Components configured in the course
  const componentBlocks = assessableBlocks.filter((b) => b.isComponent);

  const filteredList = gradebookList.filter((gb) => {
    if (!searchQuery) return true;
    const nameMatch = gb.learner.displayName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const emailMatch = gb.learner.email
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());
    return nameMatch || emailMatch;
  });

  const handleExportCsv = () => {
    if (gradebookList.length === 0) return;

    const headers = [
      'ID Học viên',
      'Họ và tên',
      'Email',
      ...componentBlocks.map((c) => `${c.title} (${c.courseWeight}%)`),
      'Điểm tổng kết',
      'Xếp loại',
      'Đạt/Không đạt',
    ];

    const rows = gradebookList.map((gb) => {
      const componentScores = componentBlocks.map((c) => {
        const item = gb.components.find((comp) => comp.blockId === c.blockId);
        return item?.final !== null && item?.final !== undefined ? item.final.toFixed(1) : '-';
      });

      return [
        gb.learner.id,
        `"${gb.learner.displayName}"`,
        gb.learner.email || '',
        ...componentScores,
        gb.totalGrade !== null && gb.totalGrade !== undefined ? gb.totalGrade.toFixed(2) : '-',
        gb.classification || 'CHUA_XEP_LOAI',
        gb.allCloAchieved ? 'ĐẠT' : 'CHƯA ĐẠT',
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gradebook_course_${courseId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
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
              <span>Sổ điểm</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-primary" />
              Sổ điểm khóa học
            </h1>
            <p className="text-sm text-muted-foreground">
              Bảng điểm tổng hợp tất cả học viên và các cột điểm thành phần.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to={`/courses/${courseId}/manage/grading`}>
              <Button variant="outline" size="sm">
                Hàng đợi chấm điểm
              </Button>
            </Link>
            <Link to={`/courses/${courseId}/manage/assessment`}>
              <Button variant="outline" size="sm" className="gap-1">
                <Settings className="w-4 h-4" />
                Cấu hình đánh giá
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={gradebookList.length === 0}
              className="gap-1"
            >
              <Download className="w-4 h-4" />
              Xuất CSV
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên hoặc email học viên..."
              className="w-full pl-9 pr-4 py-2 border border-border rounded bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Tổng cộng: <strong>{filteredList.length}</strong> học viên
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
            Không thể tải sổ điểm khóa học. Vui lòng thử lại sau.
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center text-muted-foreground">
            Không tìm thấy học viên nào.
          </div>
        ) : (
          <div
            className="bg-card rounded-lg border border-border shadow-sm overflow-x-auto focus:outline-none focus:ring-1 focus:ring-primary"
            tabIndex={0}
            role="region"
            aria-label="Bảng điểm khóa học"
          >
            <table className="w-full text-left border-collapse text-sm min-w-[800px]">
              <thead className="bg-muted/60 border-b border-border sticky top-0">
                <tr>
                  <th className="py-3 px-4 font-semibold text-muted-foreground sticky left-0 bg-muted/90 backdrop-blur z-10">
                    Học viên
                  </th>
                  {componentBlocks.map((comp) => (
                    <th
                      key={comp.blockId}
                      className="py-3 px-4 font-semibold text-muted-foreground text-center"
                    >
                      <div>{comp.title}</div>
                      <div className="text-xs font-normal text-muted-foreground">
                        {comp.courseWeight}% (Max {comp.maxScore})
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-center">
                    Điểm tổng kết (10)
                  </th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-center">
                    Xếp loại
                  </th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-center">
                    Kết quả
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredList.map((gb) => {
                  return (
                    <tr
                      key={gb.learner.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 sticky left-0 bg-background/95 backdrop-blur z-10 font-medium text-foreground">
                        <div>
                          <div>{gb.learner.displayName}</div>
                          {gb.learner.email && (
                            <div className="text-xs text-muted-foreground">
                              {gb.learner.email}
                            </div>
                          )}
                        </div>
                      </td>

                      {componentBlocks.map((comp) => {
                        const item = gb.components.find((c) => c.blockId === comp.blockId);
                        const hasScore =
                          item?.final !== null && item?.final !== undefined;

                        return (
                          <td
                            key={comp.blockId}
                            className="py-3 px-4 text-center font-mono text-sm"
                          >
                            {hasScore ? (
                              <span
                                className={`font-semibold ${
                                  (item?.final ?? 0) >= comp.maxScore * 0.5
                                    ? 'text-foreground'
                                    : 'text-destructive'
                                }`}
                              >
                                {item?.final?.toFixed(1)}
                              </span>
                            ) : item?.status === 'PENDING_MANUAL' ? (
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-sans">
                                Chờ chấm
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-3 px-4 text-center font-bold text-base font-mono">
                        {gb.totalGrade !== null && gb.totalGrade !== undefined ? (
                          <span
                            className={
                              gb.totalGrade >= 5 ? 'text-foreground' : 'text-destructive'
                            }
                          >
                            {gb.totalGrade.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-normal text-sm">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                          {gb.classification || 'CHƯA CÓ'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {gb.totalGrade !== null && gb.totalGrade !== undefined ? (
                          gb.allCloAchieved ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                              <CheckCircle2 className="w-4 h-4" /> Đạt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
                              <XCircle className="w-4 h-4" /> Chưa đạt
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">Chưa xét</span>
                        )}
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
  );
}
