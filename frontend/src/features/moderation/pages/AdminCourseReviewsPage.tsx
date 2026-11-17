import { useState } from 'react';
import { CheckCircle2, Clock, XCircle, BookOpen, ShieldCheck } from 'lucide-react';
import { Button, EmptyState, ErrorState, Skeleton, useToast } from '@/shared/ui';
import {
  useAdminCourseReviewQueue,
  useApproveCoursePublish,
  useRejectCoursePublish,
} from '../api/moderationApi';
import type { CourseReviewQueueItemDto } from '../types';

export function AdminCourseReviewsPage() {
  const { pushToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED'>('PENDING_APPROVAL');
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<CourseReviewQueueItemDto | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading, isError, refetch } = useAdminCourseReviewQueue({
    status: statusFilter,
    page,
    pageSize: 20,
  });

  const approveMutation = useApproveCoursePublish();
  const rejectMutation = useRejectCoursePublish();

  const items = data?.items ?? [];

  const handleApprove = async (course: CourseReviewQueueItemDto) => {
    try {
      await approveMutation.mutateAsync(course.courseId);
      pushToast({
        title: `Đã phê duyệt xuất bản "${course.name}".`,
        tone: 'success',
      });
      refetch();
    } catch (err: any) {
      pushToast({
        title: err?.title ?? 'Không thể phê duyệt khóa học.',
        tone: 'error',
      });
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget || !rejectReason.trim()) return;

    try {
      await rejectMutation.mutateAsync({
        courseId: rejectTarget.courseId,
        reason: rejectReason.trim(),
      });
      pushToast({
        title: `Đã từ chối xuất bản "${rejectTarget.name}".`,
        tone: 'default',
      });
      setRejectTarget(null);
      setRejectReason('');
      refetch();
    } catch (err: any) {
      pushToast({
        title: err?.title ?? 'Không thể từ chối khóa học.',
        tone: 'error',
      });
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6" data-testid="admin-course-reviews-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Kiểm duyệt xuất bản khóa học
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mọi khóa học phải được Admin phê duyệt mới xuất hiện trên nền tảng với người khác.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {[
          { key: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
          { key: 'PUBLISHED', label: 'Đã xuất bản' },
          { key: 'REJECTED', label: 'Đã từ chối' },
        ].map((tab) => (
          <Button
            key={tab.key}
            size="sm"
            variant={statusFilter === tab.key ? 'primary' : 'outline'}
            onClick={() => {
              setStatusFilter(tab.key as any);
              setPage(1);
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Không thể tải hàng đợi kiểm duyệt khóa học"
          onRetry={() => refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="Không có khóa học nào trong danh sách này"
          description="Hiện tại không có khóa học nào ở trạng thái đã chọn."
          icon={<BookOpen className="h-10 w-10 text-muted-foreground" />}
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.courseId}
              className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold">{item.name}</span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                    {item.accessMode}
                  </span>
                  {item.publishStatus === 'PENDING_APPROVAL' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      <Clock className="h-3 w-3" /> Chờ duyệt
                    </span>
                  )}
                  {item.publishStatus === 'PUBLISHED' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      <CheckCircle2 className="h-3 w-3" /> Đã xuất bản
                    </span>
                  )}
                  {item.publishStatus === 'REJECTED' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">
                      <XCircle className="h-3 w-3" /> Đã từ chối
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Giảng viên: <span className="font-medium text-foreground">{item.owner.displayName}</span>
                  {item.submittedForReviewAt && (
                    <> · Gửi lúc: {new Date(item.submittedForReviewAt).toLocaleString('vi-VN')}</>
                  )}
                </p>
                {item.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                )}
                {item.rejectionReason && (
                  <p className="text-xs text-rose-600">Lý do từ chối: {item.rejectionReason}</p>
                )}
              </div>

              {item.publishStatus === 'PENDING_APPROVAL' && (
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-rose-300 text-rose-700 hover:bg-rose-50"
                    disabled={rejectMutation.isPending || approveMutation.isPending}
                    onClick={() => {
                      setRejectTarget(item);
                      setRejectReason('');
                    }}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" />
                    Từ chối
                  </Button>
                  <Button
                    size="sm"
                    disabled={rejectMutation.isPending || approveMutation.isPending}
                    onClick={() => handleApprove(item)}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Phê duyệt xuất bản
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleRejectSubmit}
            className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl"
          >
            <h2 className="text-lg font-bold">Từ chối xuất bản khóa học</h2>
            <p className="text-sm text-muted-foreground">
              Khóa học: <span className="font-semibold text-foreground">{rejectTarget.name}</span>
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Lý do từ chối (bắt buộc)</label>
              <textarea
                required
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do chi tiết để giảng viên chỉnh sửa..."
                className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectTarget(null)}
                disabled={rejectMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={rejectMutation.isPending || !rejectReason.trim()}
              >
                Xác nhận từ chối
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
