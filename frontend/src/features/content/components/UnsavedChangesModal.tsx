import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from '@/shared/ui';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  chapterTitle: string;
  onStay: () => void;
  onSaveDraft: () => void;
  onLeave: () => void;
  isSaving?: boolean;
}

export function UnsavedChangesModal({
  isOpen,
  chapterTitle,
  onStay,
  onSaveDraft,
  onLeave,
  isSaving = false,
}: UnsavedChangesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onStay}>
      <DialogContent className="sm:max-w-md p-6 bg-card border border-border/80 rounded-2xl shadow-xl">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                Rời khỏi trang?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                Bạn có thay đổi chưa lưu trên chương &quot;{chapterTitle || 'Chưa đặt tên'}&quot;. Mọi
                nội dung vừa biên tập sẽ bị mất nếu bạn rời đi mà không nhấn lưu.
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onStay}
            disabled={isSaving}
            className="text-xs rounded-xl text-muted-foreground hover:text-foreground"
          >
            Ở lại tiếp tục sửa
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="text-xs rounded-xl border-border hover:bg-muted"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu nháp'}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onLeave}
            disabled={isSaving}
            className="bg-red-500/90 hover:bg-red-500 text-white text-xs font-semibold rounded-xl px-3.5"
          >
            Rời đi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
