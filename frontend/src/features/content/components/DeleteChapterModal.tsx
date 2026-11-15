import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from '@/shared/ui';

interface DeleteChapterModalProps {
  isOpen: boolean;
  chapterTitle: string;
  blockCount: number;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteChapterModal({
  isOpen,
  chapterTitle,
  blockCount,
  onCancel,
  onConfirm,
  isDeleting = false,
}: DeleteChapterModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md p-6 bg-card border border-border/80 rounded-2xl shadow-xl">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                Xóa chương học?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                Chương &quot;{chapterTitle || 'Chưa đặt tên'}&quot; và {blockCount} block bên trong
                sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isDeleting}
            className="text-xs rounded-xl"
          >
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-xl px-4"
          >
            {isDeleting ? 'Đang xóa...' : 'Xóa chương'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
