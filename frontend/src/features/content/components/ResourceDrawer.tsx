import React, { useState } from 'react';
import {
  X,
  Search,
  Upload,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Archive,
  Trash2,
  Check,
  AlertTriangle,
  Loader2,
  FolderOpen,
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

interface ResourceDrawerProps {
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
  pickerMode?: boolean;
  onSelectResource?: (resource: ResourceDto) => void;
}

export function ResourceDrawer({
  courseId,
  isOpen,
  onClose,
  pickerMode = false,
  onSelectResource,
}: ResourceDrawerProps) {
  const { pushToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKind, setSelectedKind] = useState<string>('ALL');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);

  // Delete modal state
  const [deletingResource, setDeletingResource] = useState<ResourceDto | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  const { data: resources, isLoading, isError, error, refetch } = useResourcesQuery(courseId);
  const { mutateAsync: createResource } = useCreateResourceMutation(courseId);
  const { mutateAsync: deleteResource, isPending: isDeleting } = useDeleteResourceMutation(courseId);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadPercent(0);

      const created = await uploadAndCommitResource(
        courseId,
        file,
        (body) => createResource(body),
        (pct) => setUploadPercent(pct)
      );

      pushToast({
        title: 'Tải lên tài nguyên thành công',
        description: `Tệp "${file.name}" đã được lưu vào kho tài nguyên khóa học.`,
        tone: 'success',
      });

      if (pickerMode && onSelectResource) {
        onSelectResource(created);
        onClose();
      }
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
      if (err instanceof ApiProblemError && (err.status === 409 || err.code === 'RESOURCE_IN_USE')) {
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kho tài nguyên khóa học"
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
    >
      {/* Sliding Drawer Container */}
      <div className="w-full max-w-2xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="border-b border-border p-4 sm:p-5 flex items-center justify-between bg-muted/20">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              <span>Kho tài nguyên khóa học (SCR-CNT-07)</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quản lý hình ảnh, video, âm thanh và tệp đính kèm dùng trong bài giảng
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng tài nguyên"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Upload Action Zone */}
        <div className="p-4 sm:p-5 border-b border-border bg-muted/10">
          <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-card p-5 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-xs font-semibold text-foreground">
                  Đang tải lên và xử lý ({uploadPercent ?? 0}%)...
                </p>
                <p className="text-[11px] text-muted-foreground">Vui lòng không đóng cửa sổ này</p>
              </div>
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  Nhấp để tải lên tệp mới hoặc kéo thả vào đây
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ảnh ≤ 5 MB · Video, Audio, PDF, Tệp nén ≤ 20 MB (DEC-05)
                </p>
              </>
            )}
          </label>
        </div>

        {/* Search & Kind Filters */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm tài nguyên theo tên tệp..."
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

        {/* Resource List with 4 UI states */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              title="Không thể tải danh sách tài nguyên"
              error={error}
              onRetry={() => refetch()}
            />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              title="Chưa có tài nguyên nào"
              description="Khóa học này chưa có tài nguyên hoặc không có tệp khớp với tìm kiếm của bạn."
            />
          ) : (
            filteredItems.map((res) => (
              <div
                key={res.id}
                className="group flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-xs hover:border-primary/50 transition-all"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    {getResourceIcon(res.kind || 'OTHER')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                      {res.originalFilename || 'Tài nguyên'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatFileSize(res.sizeBytes)} · {res.kind} ·{' '}
                      {res.createdAt ? new Date(res.createdAt).toLocaleDateString('vi-VN') : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {pickerMode && onSelectResource && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        onSelectResource(res);
                        onClose();
                      }}
                      className="h-8 px-2.5 text-xs bg-primary hover:bg-primary/90 text-white"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Chọn tệp
                    </Button>
                  )}

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
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-border p-4 bg-muted/20 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deletingResource)} onOpenChange={() => setDeletingResource(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Xóa tài nguyên khỏi khóa học?
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa tài nguyên{' '}
              <strong>{deletingResource?.originalFilename}</strong>? Hành động này sẽ xóa mềm tài
              nguyên khỏi thư viện.
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
