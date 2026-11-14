import { AlertTriangle } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui';

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function UnsavedChangesDialog({
  isOpen,
  onCancel,
  onConfirm,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Có thay đổi chưa được lưu!
          </DialogTitle>
          <DialogDescription className="text-foreground/90 pt-1">
            Bạn có các chỉnh sửa chưa lưu trong bản nháp này. Nếu rời đi bây giờ, mọi thay đổi chưa
            được lưu sẽ bị mất vĩnh viễn.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Tiếp tục chỉnh sửa
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
          >
            Rời đi không lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
