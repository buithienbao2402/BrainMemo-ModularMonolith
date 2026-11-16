import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ClipboardCheck,
  Filter,
  CheckCircle,
  Clock,
  ArrowRight,
  FileText,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import { useGradingQueue, type GradingQueueItemDto } from '../api/assessmentApi';

export function GradingQueuePage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const [selectedKind, setSelectedKind] = useState<'ALL' | 'QUIZ_ATTEMPT' | 'ASSIGNMENT'>('ALL');

  const { data: queueItems = [], isLoading, error } = useGradingQueue(
    courseId,
    selectedKind === 'ALL' ? undefined : selectedKind,
  );

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
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
              <span>Đánh giá & Chấm điểm</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-primary" />
              Hàng đợi chấm điểm
            </h1>
            <p className="text-sm text-muted-foreground">
              Danh sách bài làm tự luận và bài tập nộp cần chấm điểm thủ công.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to={`/courses/${courseId}/manage/gradebook`}>
              <Button variant="outline" size="sm">
                Sổ điểm khóa học
              </Button>
            </Link>
            <Link to={`/courses/${courseId}/manage/assessment`}>
              <Button variant="outline" size="sm">
                Cấu hình đánh giá
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Filter className="w-4 h-4 text-muted-foreground mr-1" />
          <button
            type="button"
            onClick={() => setSelectedKind('ALL')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              selectedKind === 'ALL'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Tất cả ({queueItems.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedKind('QUIZ_ATTEMPT')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              selectedKind === 'QUIZ_ATTEMPT'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Bài kiểm tra (Tự luận)
          </button>
          <button
            type="button"
            onClick={() => setSelectedKind('ASSIGNMENT')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              selectedKind === 'ASSIGNMENT'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Bài tập nộp file
          </button>
        </div>

        {/* Queue Content */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
            Không thể tải hàng đợi chấm điểm. Vui lòng thử lại sau.
          </div>
        ) : queueItems.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground">Không có bài chờ chấm</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Tất cả bài thi trắc nghiệm và bài tập nộp đều đã được chấm điểm hoàn tất!
            </p>
          </div>
        ) : (
          <div
            className="bg-card rounded-lg border border-border shadow-sm overflow-x-auto focus:outline-none focus:ring-1 focus:ring-primary"
            tabIndex={0}
            role="region"
            aria-label="Danh sách bài chờ chấm"
          >
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="py-3 px-4 font-semibold text-muted-foreground">Học viên</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground">Tên bài học</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground">Loại hoạt động</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground">Thời gian nộp</th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {queueItems.map((item: GradingQueueItemDto) => {
                  const isQuiz = item.kind === 'QUIZ_ATTEMPT';
                  return (
                    <tr key={`${item.kind}-${item.sourceId}`} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">
                        <div>
                          <span>{item.learner.displayName}</span>
                          {item.learner.email && (
                            <span className="block text-xs text-muted-foreground">
                              {item.learner.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-foreground">{item.blockTitle}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isQuiz
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {isQuiz ? <HelpCircle className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          {isQuiz ? 'Tự luận Quiz' : 'Bài tập'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {item.submittedAt ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(item.submittedAt).toLocaleString('vi-VN')}
                          </span>
                        ) : (
                          'Chưa rõ'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/courses/${courseId}/manage/grading/${item.kind}/${item.sourceId}`}
                        >
                          <Button size="sm" className="gap-1">
                            Chấm bài
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
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
