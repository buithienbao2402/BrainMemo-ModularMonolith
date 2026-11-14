import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FolderOpen,
  Search,
  Upload,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Archive,
  Trash2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Button,
  Input,
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
import { useCourseQuery, useMyCoursesQuery } from '@/features/course/api/courseApi';
import {
  useResourcesQuery,
  useCreateResourceMutation,
  useDeleteResourceMutation,
  uploadAndCommitResource,
  type ResourceDto,
} from '../api/contentApi';
import { useToast } from '@/shared/ui';
import { ApiProblemError } from '@/shared/api';
import { cn } from '@/shared/lib/utils';

export function ResourceManagementPage() {
  const { courseId: paramCourseId } = useParams<{ courseId?: string }>();
  const { pushToast } = useToast();

  // If accessed from `/manage/resources` (global LMS menu), pick the first owned course or selector
  const { data: myCourses } = useMyCoursesQuery({ relation: 'OWNED' });
  const [selectedCourseId, setSelectedCourseId] = useState<string>(paramCourseId || '');

  const effectiveCourseId = paramCourseId || selectedCourseId || myCourses?.items?.[0]?.id || '';

  const { data: course } = useCourseQuery(effectiveCourseId);
  const {
    data: resources,
    isLoading,
    isError,
    error,
    refetch,
  } = useResourcesQuery(effectiveCourseId);

  const { mutateAsync: createResource } = useCreateResourceMutation(effectiveCourseId);
  const { mutateAsync: deleteResource, isPending: isDeleting } =
    useDeleteResourceMutation(effectiveCourseId);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKind, setSelectedKind] = useState<string>('ALL');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);

  // Delete modal state
  const [deletingResource, setDeletingResource] = useState<ResourceDto | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !effectiveCourseId) return;

    try {
      setIsUploading(true);
      setUploadPercent(0);

      await uploadAndCommitResource(
        effectiveCourseId,
        file,
        (body) => createResource(body),
        (pct) => setUploadPercent(pct)
      );

      pushToast({
        title: 'Tải lên tài nguyên thành công',
        description: `Tệp "${file.name}" đã được tải lên kho tài nguyên.`,
        tone: 'success',
      });
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'detail' in err
          ? String((err as { detail?: string }).detail)
          : err instanceof Error
          ? err.message
          : 'Không thể tải tệp lên. Vui lòng kiểm tra dung lượng (ảnh ≤ 5MB, tệp ≤ 20MB) và định dạng.';
      pushToast({
        title: 'Tải lên thất bại',
        description: msg,
        tone: 'error',
      });
    } finally {
      setIsUploading(false);
      setUploadPercent(null);
      e.target.value = '';
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingResource?.id) return;
    setDeleteErrorMessage(null);

    try {
      await deleteResource(deletingResource.id);
      pushToast({
        title: 'Đã xóa tài nguyên',
        description: `Tài nguyên "${deletingResource.originalFilename || ''}" đã được xóa.`,
        tone: 'success',
      });
      setDeletingResource(null);
    } catch (err: unknown) {
      if (
        (err instanceof ApiProblemError && err.status === 409) ||
        (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'RESOURCE_IN_USE')
      ) {
        setDeleteErrorMessage(
          'Không thể xóa: Tài nguyên này hiện đang được sử dụng trong bài học của khóa học.'
        );
      } else {
        const msg =
          err && typeof err === 'object' && 'detail' in err
            ? String((err as { detail?: string }).detail)
            : err instanceof Error
            ? err.message
            : 'Có lỗi xảy ra khi xóa tài nguyên.';
        setDeleteErrorMessage(msg);
      }
    }
  };

  const getResourceIcon = (kind: string) => {
    switch (kind) {
      case 'IMAGE':
        return <ImageIcon className="h-5 w-5 text-emerald-500" />;
      case 'VIDEO':
        return <Video className="h-5 w-5 text-rose-500" />;
      case 'AUDIO':
        return <Music className="h-5 w-5 text-amber-500" />;
      case 'PDF':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'ARCHIVE':
        return <Archive className="h-5 w-5 text-blue-500" />;
      default:
        return <FolderOpen className="h-5 w-5 text-cyan-500" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const allItems = resources || [];
  const filteredItems = allItems.filter((res) => {
    const filename = res.originalFilename || '';
    const matchesSearch = filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKind = selectedKind === 'ALL' || res.kind === selectedKind;
    return matchesSearch && matchesKind;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Đường dẫn điều hướng" className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/manage/courses" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" />
          <span>Quản lý khóa học</span>
        </Link>
        {effectiveCourseId && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link
              to={`/courses/${effectiveCourseId}`}
              className="hover:text-foreground transition-colors truncate max-w-[200px]"
            >
              {course?.name || 'Khóa học'}
            </Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="font-semibold text-foreground">Quản lý tài nguyên (SCR-CNT-07)</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1
            aria-label="Quản lý tài nguyên khóa học"
            className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5"
          >
            <FolderOpen className="h-7 w-7 text-primary" />
            <span>Thư viện tài nguyên số (SCR-CNT-07)</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Kho tài liệu, hình ảnh minh họa, video bài giảng và học liệu đính kèm (DEC-05, DEC-06)
          </p>
        </div>

        {/* Course Switcher (if accessed from general LMS menu without param) */}
        {!paramCourseId && myCourses?.items && myCourses.items.length > 0 && (
          <div className="w-full sm:w-64">
            <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
              Chọn khóa học quản lý:
            </label>
            <select
              value={effectiveCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="h-9 w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {myCourses.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Upload Zone Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-muted/10 p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={isUploading || !effectiveCourseId}
            className="hidden"
          />
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm font-semibold text-foreground">
                Đang tải lên và xử lý tệp ({uploadPercent ?? 0}%)...
              </p>
              <p className="text-xs text-muted-foreground">Vui lòng chờ trong giây lát</p>
            </div>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm sm:text-base font-semibold text-foreground">
                Tải lên tệp tài nguyên mới
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Kéo thả tệp hoặc nhấp để duyệt máy tính. Hình ảnh ≤ 5 MB; Video, Audio, PDF, ZIP ≤
                20 MB (DEC-05).
              </p>
            </>
          )}
        </label>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm tài nguyên theo tên..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'IMAGE', label: 'Hình ảnh' },
            { id: 'VIDEO', label: 'Video' },
            { id: 'AUDIO', label: 'Âm thanh' },
            { id: 'PDF', label: 'Tài liệu PDF' },
            { id: 'ARCHIVE', label: 'Tệp nén' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedKind(tab.id)}
              className={cn(
                'rounded-full px-3 py-1 font-medium shrink-0 transition-colors',
                selectedKind === tab.id
                  ? 'bg-primary text-white font-semibold'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resource Cards Grid */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Không thể tải thư viện tài nguyên"
            error={error}
            onRetry={() => refetch()}
          />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="Chưa có tài nguyên nào"
            description="Tải lên tệp tài nguyên đầu tiên của khóa học bằng khung tải lên ở trên."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((res) => (
              <div
                key={res.id}
                className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                      {getResourceIcon(res.kind || 'OTHER')}
                    </div>

                    <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                      {res.kind}
                    </span>
                  </div>

                  <div>
                    <h3
                      title={res.originalFilename || ''}
                      className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors"
                    >
                      {res.originalFilename || 'Tài nguyên'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatFileSize(res.sizeBytes)} ·{' '}
                      {res.createdAt ? new Date(res.createdAt).toLocaleDateString('vi-VN') : ''}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {(res.id || '').slice(0, 8)}...
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeletingResource(res);
                      setDeleteErrorMessage(null);
                    }}
                    title="Xóa tài nguyên"
                    aria-label={`Xóa tài nguyên ${res.originalFilename}`}
                    className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deletingResource)} onOpenChange={() => setDeletingResource(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Xác nhận xóa tài nguyên?
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa tài nguyên{' '}
              <strong>{deletingResource?.originalFilename}</strong>? Hành động này sẽ xóa mềm tệp
              khỏi khóa học.
            </DialogDescription>
          </DialogHeader>

          {deleteErrorMessage && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">
              {deleteErrorMessage}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingResource(null)}
              disabled={isDeleting}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
