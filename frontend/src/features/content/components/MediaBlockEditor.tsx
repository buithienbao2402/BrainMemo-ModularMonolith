import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Video,
  Music,
  FolderOpen,
  Upload,
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

interface MediaBlockEditorProps {
  courseId: string;
  blockType: 'IMAGE' | 'VIDEO' | 'AUDIO';
  title?: string | null;
  resourceId?: string | null;
  onUpdate: (updates: { title?: string | null; resourceId?: string | null }) => void;
  onOpenResourcePicker: () => void;
}

export function MediaBlockEditor({
  courseId,
  blockType,
  title,
  resourceId,
  onUpdate,
  onOpenResourcePicker,
}: MediaBlockEditorProps) {
  const { pushToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);

  const { data: resources } = useResourcesQuery(courseId);
  const { mutateAsync: createResource } = useCreateResourceMutation(courseId);

  const selectedResource = resources?.find((r) => r.id === resourceId);

  // If resource selected, get its presigned download URL for live preview
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
        title: 'Tải lên thành công',
        description: `Tài nguyên "${file.name}" đã được gắn vào khối.`,
        tone: 'success',
      });
    } catch (err: unknown) {
      pushToast({
        title: 'Tải lên thất bại',
        description:
          err instanceof Error
            ? err.message
            : 'Không thể tải tệp lên. Vui lòng kiểm tra dung lượng và định dạng.',
        tone: 'error',
      });
    } finally {
      setIsUploading(false);
      setUploadPercent(null);
      e.target.value = '';
    }
  };

  const getMediaMeta = () => {
    switch (blockType) {
      case 'IMAGE':
        return {
          icon: ImageIcon,
          label: 'Hình ảnh',
          accept: 'image/png, image/jpeg, image/webp',
          hint: 'Ảnh PNG, JPG, WebP tối đa 5 MB (DEC-05)',
        };
      case 'VIDEO':
        return {
          icon: Video,
          label: 'Video',
          accept: 'video/mp4, video/webm',
          hint: 'Video MP4, WebM tối đa 20 MB (DEC-05)',
        };
      case 'AUDIO':
        return {
          icon: Music,
          label: 'Âm thanh',
          accept: 'audio/mpeg, audio/wav, audio/ogg',
          hint: 'Tệp âm thanh MP3, WAV, OGG tối đa 20 MB (DEC-05)',
        };
    }
  };

  const meta = getMediaMeta();
  const IconComponent = meta.icon;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      {/* Title / Caption */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">
          Chú thích / Tiêu đề {meta.label.toLowerCase()}
        </label>
        <Input
          value={title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder={`Nhập chú thích hoặc tiêu đề ${meta.label.toLowerCase()}...`}
          className="text-sm"
        />
      </div>

      {/* Selected Resource Card or Empty Upload Slot */}
      {resourceId ? (
        <div className="rounded-xl border border-border/80 bg-muted/30 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconComponent className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {selectedResource?.originalFilename || 'Tài nguyên đã liên kết'}
              </p>
              <p className="text-xs text-muted-foreground">
                Mã: <code className="font-mono text-[11px]">{resourceId.slice(0, 8)}...</code>
                {selectedResource?.sizeBytes && (
                  <span> · {(selectedResource.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
              aria-label="Gỡ tệp tài nguyên"
              className="text-xs text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-border/80 bg-muted/10 p-6 text-center">
          <IconComponent className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-foreground mb-1">
            Chưa có {meta.label.toLowerCase()} nào được chọn
          </p>
          <p className="text-xs text-muted-foreground mb-4">{meta.hint}</p>

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
                accept={meta.accept}
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
                    Tải lên tệp mới
                  </>
                )}
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Live Preview If image */}
      {blockType === 'IMAGE' && downloadData?.url && (
        <div className="mt-3 overflow-hidden rounded-xl border border-border/60 bg-black/5 aspect-video max-h-64 flex items-center justify-center">
          <img
            src={downloadData.url}
            alt={title || 'Xem trước ảnh'}
            className="max-h-64 object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
