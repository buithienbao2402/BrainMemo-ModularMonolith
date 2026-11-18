import { AlertTriangle, CheckCircle2, Clock, FileEdit, Send, Undo2, XCircle } from 'lucide-react';
import { Button, useToast } from '@/shared/ui';
import {
  useCancelCourseReviewMutation,
  useSubmitCourseReviewMutation,
  useUnpublishCourseMutation,
  type CourseDto,
} from '../api/courseApi';

interface CoursePublishStatusBannerProps {
  course: CourseDto;
  onUpdated?: () => void;
}

export function CoursePublishStatusBanner({ course, onUpdated }: CoursePublishStatusBannerProps) {
  const { pushToast } = useToast();
  const courseId = course.id ?? '';
  const publishStatus = course.publishStatus ?? 'DRAFT';

  const submitReview = useSubmitCourseReviewMutation(courseId);
  const cancelReview = useCancelCourseReviewMutation(courseId);
  const unpublish = useUnpublishCourseMutation(courseId);

  const isBusy = submitReview.isPending || cancelReview.isPending || unpublish.isPending;

  const handleSubmitReview = async () => {
    try {
      await submitReview.mutateAsync();
      pushToast({ title: 'Đã gửi yêu cầu kiểm duyệt xuất bản khóa học.', tone: 'success' });
      onUpdated?.();
    } catch (err: any) {
      pushToast({ title: err?.title ?? 'Không thể gửi yêu cầu kiểm duyệt.', tone: 'error' });
    }
  };

  const handleCancelReview = async () => {
    try {
      await cancelReview.mutateAsync();
      pushToast({ title: 'Đã hủy yêu cầu kiểm duyệt. Khóa học quay về trạng thái Nháp.', tone: 'default' });
      onUpdated?.();
    } catch (err: any) {
      pushToast({ title: err?.title ?? 'Không thể hủy yêu cầu.', tone: 'error' });
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublish.mutateAsync();
      pushToast({ title: 'Đã hủy xuất bản khóa học.', tone: 'default' });
      onUpdated?.();
    } catch (err: any) {
      pushToast({ title: err?.title ?? 'Không thể hủy xuất bản.', tone: 'error' });
    }
  };

  if (publishStatus === 'PUBLISHED') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">
              Khóa học đã xuất bản
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Khóa học đã được Admin phê duyệt và đang hiển thị trên nền tảng theo chế độ truy cập.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={isBusy}
          onClick={handleUnpublish}
          className="border-emerald-300 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-200"
        >
          <Undo2 className="mr-1.5 h-3.5 w-3.5" />
          Hủy xuất bản
        </Button>
      </div>
    );
  }

  if (publishStatus === 'PENDING_APPROVAL') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-100">
              Đang chờ Admin kiểm duyệt xuất bản
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Hiện tại chỉ mình bạn và Admin kiểm duyệt mới xem được khóa học này.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={isBusy}
          onClick={handleCancelReview}
          className="border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200"
        >
          <XCircle className="mr-1.5 h-3.5 w-3.5" />
          Hủy yêu cầu duyệt
        </Button>
      </div>
    );
  }

  if (publishStatus === 'REJECTED') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm dark:border-rose-900/50 dark:bg-rose-950/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div>
            <p className="font-semibold text-rose-900 dark:text-rose-100">
              Yêu cầu xuất bản bị từ chối
            </p>
            <p className="text-xs text-rose-700 dark:text-rose-300">
              Lý do: <span className="font-medium">{course.rejectionReason || 'Chưa đạt yêu cầu kiểm duyệt.'}</span>
            </p>
          </div>
        </div>
        <Button
          size="sm"
          disabled={isBusy || course.accessMode === 'ONLY_ME'}
          onClick={handleSubmitReview}
        >
          <Send className="mr-1.5 h-3.5 w-3.5" />
          Gửi duyệt lại
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center gap-3">
        <FileEdit className="h-5 w-5 shrink-0 text-slate-600 dark:text-slate-400" />
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            Bản nháp (Chỉ mình bạn xem được)
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Khóa học cần được Admin kiểm duyệt và xuất bản mới xuất hiện với người khác trên nền tảng.
          </p>
        </div>
      </div>
      <Button
        size="sm"
        disabled={isBusy || course.accessMode === 'ONLY_ME'}
        onClick={handleSubmitReview}
        title={course.accessMode === 'ONLY_ME' ? 'Đổi chế độ truy cập sang Public hoặc Private trước khi gửi duyệt' : undefined}
      >
        <Send className="mr-1.5 h-3.5 w-3.5" />
        Gửi kiểm duyệt xuất bản
      </Button>
    </div>
  );
}
