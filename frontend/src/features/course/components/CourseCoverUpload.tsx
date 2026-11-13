import { useRef, useState } from 'react';
import { Image, UploadCloud, Trash2 } from 'lucide-react';
import { uploadFileToStorage } from '@/shared/api';
import { Button } from '@/shared/ui';

interface CourseCoverUploadProps {
  currentCoverUrl?: string | null;
  onCoverUploaded: (uploadKey: string, previewUrl: string) => void;
  onCoverRemoved: () => void;
  disabled?: boolean;
}

export function CourseCoverUpload({
  currentCoverUrl,
  onCoverUploaded,
  onCoverRemoved,
  disabled = false,
}: CourseCoverUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentCoverUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsUploading(true);
    setProgress(0);

    try {
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      const uploadKey = await uploadFileToStorage({
        file,
        purpose: 'COURSE_COVER',
        onProgress: (p) => setProgress(p),
      });

      onCoverUploaded(uploadKey, localPreview);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tải lên ảnh bìa. Vui lòng thử lại.');
      setPreviewUrl(currentCoverUrl || null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setErrorMsg(null);
    onCoverRemoved();
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full max-w-md rounded-2xl overflow-hidden border-2 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center group">
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Ảnh bìa khóa học"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                className="bg-background/90"
              >
                <UploadCloud className="h-4 w-4 mr-1.5" />
                Đổi ảnh khác
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
                disabled={disabled || isUploading}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Gỡ ảnh
              </Button>
            </div>
          </>
        ) : (
          <div className="p-6 text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Image className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Tải ảnh bìa cho khóa học
              </p>
              <p className="text-xs text-muted-foreground">
                Hỗ trợ PNG, JPG, WebP. Tối đa 5 MB (theo DEC-05). Tỷ lệ 16:9 khuyên dùng.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
            >
              <UploadCloud className="h-4 w-4 mr-1.5" />
              Chọn tệp ảnh
            </Button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />

      {isUploading && (
        <div className="w-full max-w-md space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Đang tải lên ảnh bìa...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {errorMsg && (
        <p className="text-xs text-destructive font-medium" role="alert">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
