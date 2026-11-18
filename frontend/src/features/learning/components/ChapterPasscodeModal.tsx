import { useState } from 'react';
import { Lock, KeyRound, AlertTriangle } from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui';
import { useUnlockChapterMutation } from '@/features/course';

interface ChapterPasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  chapterId: string;
  chapterTitle?: string;
  onSuccess: () => void;
}

export function ChapterPasscodeModal({
  isOpen,
  onClose,
  courseId,
  chapterId,
  chapterTitle,
  onSuccess,
}: ChapterPasscodeModalProps) {
  const [passcode, setPasscode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { mutateAsync: unlockChapter, isPending } = useUnlockChapterMutation(courseId, chapterId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu mở khóa.');
      return;
    }

    try {
      setErrorMessage('');
      await unlockChapter(passcode.trim());
      setPasscode('');
      onSuccess();
    } catch (err: any) {
      if (err?.status === 429 || err?.code === 'TOO_MANY_REQUESTS') {
        setErrorMessage('Bạn đã thử sai quá 5 lần. Vui lòng thử lại sau 15 phút.');
      } else if (err?.code === 'INVALID_PASSCODE' || err?.status === 400) {
        setErrorMessage('Mật khẩu mở khóa không chính xác. Vui lòng kiểm tra lại.');
      } else {
        setErrorMessage(err?.detail || err?.message || 'Không thể mở khóa chương. Vui lòng thử lại.');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <Lock className="h-5 w-5" />
            <DialogTitle>Chương học có bảo vệ Passcode</DialogTitle>
          </div>
          <DialogDescription>
            {chapterTitle ? (
              <>
                Chương <strong>"{chapterTitle}"</strong> yêu cầu nhập mật khẩu để mở khóa và học nội dung.
              </>
            ) : (
              'Chương này yêu cầu mật khẩu để mở khóa và học nội dung.'
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <label
              htmlFor="passcode-input"
              className="text-xs font-semibold text-foreground flex items-center gap-1.5"
            >
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              <span>Mật khẩu mở khóa (Passcode)</span>
            </label>
            <Input
              id="passcode-input"
              type="password"
              placeholder="Nhập passcode chương..."
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              autoFocus
              className="rounded-xl"
            />
            {errorMessage && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Passcode do giảng viên khóa học cung cấp. Nhập sai quá 5 lần sẽ bị tạm khóa 15 phút.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Quay lại
            </Button>
            <Button
              type="submit"
              disabled={isPending || !passcode.trim()}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {isPending ? 'Đang mở khóa...' : 'Mở khóa chương'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
