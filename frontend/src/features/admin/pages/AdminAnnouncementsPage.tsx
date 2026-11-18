import { useState } from 'react';
import {
  AlertCircle,
  Megaphone,
  Radio,
  Send,
} from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  useToast,
} from '@/shared/ui';
import { useCreateAnnouncement } from '../api/adminApi';

export function AdminAnnouncementsPage() {
  const { pushToast } = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [previewTab, setPreviewTab] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutateAsync: createAnnouncement, isPending } = useCreateAnnouncement();

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập tiêu đề thông báo.');
      return;
    }
    if (!body.trim()) {
      setErrorMessage('Vui lòng nhập nội dung thông báo phát thanh.');
      return;
    }

    setConfirmOpen(true);
  };

  const handleBroadcast = async () => {
    setErrorMessage(null);
    try {
      await createAnnouncement({
        title: title.trim(),
        body: body.trim(),
      });

      setConfirmOpen(false);
      setTitle('');
      setBody('');
      setPreviewTab('EDIT');

      pushToast({
        title: 'Đã phát sóng thông báo toàn hệ thống',
        description: 'Thông báo đã được tiếp nhận và phát thanh tới tất cả người dùng trực tuyến.',
        tone: 'success',
      });
    } catch (err: any) {
      setConfirmOpen(false);
      setErrorMessage(err?.message || 'Không thể phát sóng thông báo. Vui lòng thử lại.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6" data-testid="admin-announcements-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Megaphone className="h-6 w-6 text-brand-orange" />
          Phát thông báo toàn hệ thống (System Announcements)
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gửi thông điệp khẩn, thông báo bảo trì hoặc cập nhật chính sách đến toàn bộ người dùng đang trực tuyến trên BrainMemo LMS.
        </p>
      </div>

      {/* Info Card */}
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground">
        <Radio className="h-5 w-5 text-primary shrink-0 mt-0.5 animate-pulse" />
        <div className="space-y-1">
          <p className="font-bold text-foreground">Cơ chế phát sóng thời gian thực (Real-time Broadcast)</p>
          <p>
            Thông báo sau khi phát sẽ được gửi qua WebSocket đến các phiên đăng nhập đang hoạt động và lưu vào hộp thư chuông thông báo cá nhân của mọi học viên & giảng viên.
          </p>
        </div>
      </div>

      {errorMessage ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {/* Form Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <form onSubmit={handleOpenConfirm} className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="announcement-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tiêu đề thông báo <span className="text-destructive">*</span>
            </label>
            <Input
              id="announcement-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Bảo trì nâng cấp hệ thống máy chủ ngày 20/11..."
              className="text-sm font-semibold"
            />
          </div>

          {/* Edit / Preview Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="announcement-body" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nội dung thông báo <span className="text-destructive">*</span>
              </label>

              <div className="flex items-center gap-1 rounded-lg bg-muted p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewTab('EDIT')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    previewTab === 'EDIT'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Soạn thảo
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('PREVIEW')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    previewTab === 'PREVIEW'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Xem trước (Preview)
                </button>
              </div>
            </div>

            {previewTab === 'EDIT' ? (
              <textarea
                id="announcement-body"
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Nhập chi tiết nội dung thông báo. Bạn có thể sử dụng định dạng văn bản rõ ràng, gạch đầu dòng..."
                className="w-full rounded-xl border border-input bg-background p-3.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            ) : (
              <div className="min-h-[200px] rounded-xl border border-border bg-muted/20 p-5 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold text-base">
                  <Megaphone className="h-5 w-5" />
                  <h3>{title.trim() || 'Chưa có tiêu đề'}</h3>
                </div>
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {body.trim() || <span className="text-muted-foreground italic">Chưa có nội dung soạn thảo.</span>}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" className="gap-2 font-semibold">
              <Send className="h-4 w-4" />
              Phát thông báo ngay
            </Button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-orange">
              <Megaphone className="h-5 w-5" />
              Xác nhận phát thông báo toàn hệ thống
            </DialogTitle>
            <DialogDescription>
              Hành động này sẽ gửi broadcast thông điệp tới toàn bộ tài khoản người dùng và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5 text-xs">
            <p className="font-bold text-foreground truncate">Tiêu đề: {title}</p>
            <p className="text-muted-foreground line-clamp-3 italic">"{body}"</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleBroadcast}
              disabled={isPending}
            >
              {isPending ? 'Đang phát sóng...' : 'Xác nhận phát sóng'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
