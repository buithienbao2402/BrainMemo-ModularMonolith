import { useState } from 'react';
import {
  History,
  RotateCcw,
  Calendar,
  FileCheck,
} from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Skeleton,
  EmptyState,
  ErrorState,
} from '@/shared/ui';
import {
  useChapterVersionsQuery,
  useRestoreChapterVersionMutation,
  type ChapterVersionDto,
} from '../api/contentApi';
import { useToast } from '@/shared/ui';

interface ChapterVersionsModalProps {
  courseId: string;
  chapterId: string;
  isOpen: boolean;
  onClose: () => void;
  currentVersionNo?: number;
}

export function ChapterVersionsModal({
  courseId,
  chapterId,
  isOpen,
  onClose,
  currentVersionNo,
}: ChapterVersionsModalProps) {
  const { pushToast } = useToast();
  const [selectedVersion, setSelectedVersion] = useState<ChapterVersionDto | null>(null);

  const {
    data: versions,
    isLoading,
    isError,
    error,
    refetch,
  } = useChapterVersionsQuery(courseId, chapterId);

  const { mutateAsync: restoreVersion, isPending: isRestoring } =
    useRestoreChapterVersionMutation(courseId, chapterId);

  const handleConfirmRestore = async () => {
    if (!selectedVersion || selectedVersion.versionNo === undefined) return;

    try {
      await restoreVersion(selectedVersion.versionNo);
      pushToast({
        title: 'Khôi phục phiên bản thành công',
        description: `Bản nháp làm việc đã được khôi phục về Phiên bản #${selectedVersion.versionNo}.`,
        tone: 'success',
      });
      setSelectedVersion(null);
      onClose();
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === 'object' && 'detail' in err
          ? String((err as { detail?: string }).detail)
          : err instanceof Error
          ? err.message
          : 'Không thể khôi phục phiên bản đã chọn.';
      pushToast({
        title: 'Khôi phục thất bại',
        description: errorMsg,
        tone: 'error',
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <History className="h-5 w-5 text-primary" />
              <span>Lịch sử phiên bản chương (SCR-CNT-03)</span>
            </DialogTitle>
            <DialogDescription>
              Xem lại các bản lưu trước đây và khôi phục nội dung về bản nháp làm việc (FR-CNT-17).
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[420px] overflow-y-auto space-y-3 py-2">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : isError ? (
              <ErrorState
                title="Không thể tải lịch sử phiên bản"
                error={error}
                onRetry={() => refetch()}
              />
            ) : !versions || versions.length === 0 ? (
              <EmptyState
                title="Chưa có lịch sử phiên bản"
                description="Chương này mới được khởi tạo và chưa có các bản lưu trước đó."
              />
            ) : (
              versions.map((ver) => {
                const isCurrent = ver.versionNo === currentVersionNo;
                return (
                  <div
                    key={ver.versionNo}
                    className={`flex items-center justify-between rounded-xl border p-3.5 transition-all ${
                      isCurrent
                        ? 'border-primary/50 bg-primary/5 shadow-xs'
                        : 'border-border bg-card hover:border-primary/30'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-foreground">
                          Phiên bản #{ver.versionNo}
                        </span>

                        {isCurrent && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            Bản hiện tại
                          </span>
                        )}

                        {ver.publishedAt && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <FileCheck className="h-3 w-3" />
                            Đã đăng tải
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Lưu lúc: {ver.createdAt ? new Date(ver.createdAt).toLocaleString('vi-VN') : 'Không rõ'}
                        </span>
                        {ver.restoredFromVersionNo && (
                          <span>· Khôi phục từ v{ver.restoredFromVersionNo}</span>
                        )}
                      </div>
                    </div>

                    <div>
                      {!isCurrent && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedVersion(ver)}
                          className="h-8 text-xs hover:border-primary hover:text-primary"
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1 text-primary" />
                          Khôi phục
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={Boolean(selectedVersion)} onOpenChange={() => setSelectedVersion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <RotateCcw className="h-5 w-5 text-primary" />
              Khôi phục về Phiên bản #{selectedVersion?.versionNo}?
            </DialogTitle>
            <DialogDescription>
              Hệ thống sẽ lấy toàn bộ các khối nội dung của Phiên bản #{selectedVersion?.versionNo}{' '}
              đưa vào bản nháp làm việc hiện tại. Mọi thay đổi chưa lưu trên bản nháp sẽ bị thay thế.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedVersion(null)}
              disabled={isRestoring}
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmRestore}
              disabled={isRestoring}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {isRestoring ? 'Đang khôi phục...' : 'Xác nhận khôi phục'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
