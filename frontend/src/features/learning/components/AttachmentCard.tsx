import { FileArchive, Download } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface AttachmentCardProps {
  fileName?: string;
  fileSize?: string;
  downloadUrl?: string;
  className?: string;
}

export function AttachmentCard({
  fileName = 'bai-tap-mau-closure.zip',
  fileSize = '2.4 MB',
  downloadUrl,
  className,
}: AttachmentCardProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card/80 hover:bg-card hover:border-primary/40 transition-all shadow-xs',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 sm:p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
          <FileArchive className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
              {fileName}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
              {fileSize}
            </span>
          </div>
        </div>
      </div>

      <a
        href={downloadUrl || '#download'}
        download
        onClick={(e) => {
          if (!downloadUrl) {
            e.preventDefault();
            // Trigger feedback
            alert(`Tải về tệp: ${fileName}`);
          }
        }}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-primary hover:text-primary-foreground hover:bg-primary border border-primary/30 transition-colors shrink-0"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Tải xuống</span>
      </a>
    </div>
  );
}
