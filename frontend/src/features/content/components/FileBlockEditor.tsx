import React, { useState } from 'react';
import {
  FileText,
  FolderOpen,
  Upload,
  Download,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button, Input } from '@/shared/ui';
import {
  useCreateResourceMutation,
  useResourcesQuery,
  useResourceDownloadUrlQuery,
  uploadAndCommitResource,
} from '../api/contentApi';
import { useToast } from '@/shared/ui';

interface FileBlockEditorProps {
  courseId: string;
  title?: string | null;
  resourceId?: string | null;
  onUpdate: (updates: { title?: string | null; resourceId?: string | null }) => void;
  onOpenResourcePicker: () => void;
}

export function FileBlockEditor({
  courseId,
  title,
  resourceId,
  onUpdate,
  onOpenResourcePicker,
}: FileBlockEditorProps) {
  const { pushToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);

  const { data: resources } = useResourcesQuery(courseId);
  const { mutateAsync: createResource } = useCreateResourceMutation(courseId);

  const selectedResource = resources?.find((r) => r.id === resourceId);

  const { data: downloadData } = useResourceDownloadUrlQuery(
    courseId,
    resourceId || '',
    { enabled: Boolean(resourceId) }
  );

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadPercent(0);

      const res = await uploadAndCommitResource(
        courseId,
        file,
        (body) => createResource(body),
        (percent) => setUploadPercent(percent)
      );

      onUpdate({ resourceId: res.id, title: title || file.name });
      pushToast({
        title: 'Tải tài liệu thành công',
        description: `Tệp "${file.name}" đã sẵn sàng đính kèm vào bài giảng.`,
        tone: 'success',
      });
    } catch (err: unknown) {
      pushToast({
        title: 'Tải lên thất bại',
        description:
          err instanceof Error
            ? err.message
            : 'Không thể tải tệp lên. Vui lòng kiểm tra dung lượng (≤ 20MB) và định dạng.',
        tone: 'error',
      });
    } finally {
      setIsUploading(false);
      setUploadPercent(null);
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">
          Tên hiển thị tài liệu đính kèm
        </label>
        <Input
          value={title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Ví dụ: Slide bài giảng Buổi 1, Tài liệu tham khảo..."
          className="text-sm"
        />
      </div>

      {resourceId ? (
        <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {selectedResource?.originalFilename || 'Tệp đính kèm'}
              </p>
              <p className="text-xs text-muted-foreground">
                Kích thước: {formatFileSize(selectedResource?.sizeBytes)} · Định dạng:{' '}
                {selectedResource?.contentType || 'Tài liệu'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {downloadData?.url && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <a href={downloadData.url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Tải thử
                </a>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenResourcePicker}
              className="text-xs"
            >
              <FolderOpen className="h-3.5 w-3.5 mr-1 text-primary" />
              Đổi tệp
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onUpdate({ resourceId: null })}
              aria-label="Gỡ tệp tài liệu"
              className="text-xs text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-border/80 bg-muted/10 p-6 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-foreground mb-1">
            Chưa đính kèm tệp tài liệu nào
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Hỗ trợ PDF, DOCX, XLSX, PPTX, ZIP dung lượng tối đa 20 MB (DEC-05)
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenResourcePicker}
              className="text-xs"
            >
              <FolderOpen className="h-4 w-4 mr-1.5 text-primary" />
              Chọn từ kho tài nguyên
            </Button>

            <label className="cursor-pointer">
              <input
                type="file"
                onChange={handleDirectUpload}
                disabled={isUploading}
                className="hidden"
              />
              <span className="inline-flex items-center justify-center rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors shadow-xs">
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Đang tải ({uploadPercent ?? 0}%)
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Tải lên tài liệu
                  </>
                )}
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
