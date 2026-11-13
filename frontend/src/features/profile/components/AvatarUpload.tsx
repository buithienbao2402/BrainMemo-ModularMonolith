import { useRef, useState } from 'react';
import { Camera, Trash2, UploadCloud } from 'lucide-react';
import { uploadFileToStorage } from '@/shared/api';
import { Button } from '@/shared/ui';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  displayName?: string;
  onAvatarUploaded: (uploadKey: string, previewUrl: string) => void;
  onAvatarRemoved: () => void;
  disabled?: boolean;
}

export function AvatarUpload({
  currentAvatarUrl,
  displayName = 'User',
  onAvatarUploaded,
  onAvatarRemoved,
  disabled = false,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'U';
  };

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
        purpose: 'AVATAR',
        onProgress: (p) => setProgress(p),
      });

      onAvatarUploaded(uploadKey, localPreview);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tải lên ảnh đại diện. Vui lòng thử lại.');
      setPreviewUrl(currentAvatarUrl || null);
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
    onAvatarRemoved();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-5">
        <div className="relative group">
          <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground shadow-sm">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl text-brand-orange font-bold">
                {getInitials(displayName)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs gap-1 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Đổi ảnh đại diện"
          >
            <Camera className="h-5 w-5" />
            <span>Thay đổi</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="h-4 w-4 mr-1.5" />
              {previewUrl ? 'Đổi ảnh khác' : 'Tải ảnh lên'}
            </Button>

            {previewUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || isUploading}
                onClick={handleRemove}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Gỡ ảnh
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Hỗ trợ PNG, JPG, WebP. Tối đa 5 MB (theo DEC-05).
          </p>
        </div>
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
        <div className="w-full max-w-xs space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Đang tải lên ảnh đại diện...</span>
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
