import { useState } from 'react';
import { AlertCircle, Flag, Plus, X } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, useToast } from '@/shared/ui';
import { useCreateReport } from '../api/moderationApi';
import type { ReportTargetType } from '../types';

export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
}

const REPORT_REASONS = [
  { value: 'SPAM', label: 'Spam / Quảng cáo không liên quan' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Nội dung phản cảm, độc hại hoặc không phù hợp' },
  { value: 'HARASSMENT', label: 'Quấy rối, xúc phạm hoặc kích động thù ghét' },
  { value: 'COPYRIGHT_VIOLATION', label: 'Vi phạm bản quyền / Quyền sở hữu trí tuệ' },
  { value: 'MISINFORMATION', label: 'Thông tin sai lệch hoặc gian lận học tập' },
  { value: 'OTHER', label: 'Lý do khác' },
];

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
}: ReportModalProps) {
  const { pushToast } = useToast();
  const [reason, setReason] = useState('SPAM');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceList, setEvidenceList] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { mutateAsync: createReport, isPending } = useCreateReport();

  const handleAddEvidence = () => {
    const trimmed = evidenceUrl.trim();
    if (!trimmed) return;
    if (evidenceList.includes(trimmed)) {
      setEvidenceUrl('');
      return;
    }
    setEvidenceList((prev) => [...prev, trimmed]);
    setEvidenceUrl('');
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidenceList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const fullEvidenceUrls = [...evidenceList];
    if (evidenceUrl.trim() && !fullEvidenceUrls.includes(evidenceUrl.trim())) {
      fullEvidenceUrls.push(evidenceUrl.trim());
    }

    try {
      await createReport({
        targetType,
        targetId,
        reason,
        description: description.trim() || undefined,
        evidenceUrls: fullEvidenceUrls.length > 0 ? fullEvidenceUrls : undefined,
      });

      pushToast({
        title: 'Báo cáo đã được gửi thành công',
        description: 'Đội ngũ kiểm duyệt sẽ xem xét nội dung và phản hồi theo quy định.',
        tone: 'success',
      });

      // Reset form
      setReason('SPAM');
      setDescription('');
      setEvidenceList([]);
      setEvidenceUrl('');
      onClose();
    } catch (err: any) {
      if (err?.code === 'DUPLICATE_REPORT' || err?.status === 409) {
        setErrorMsg('Bạn đã gửi báo cáo cho nội dung này trước đó và báo cáo đang được xem xét.');
      } else {
        setErrorMsg(err?.message || 'Không thể gửi báo cáo. Vui lòng thử lại sau.');
      }
    }
  };

  const targetLabel = targetType === 'COURSE' ? 'khóa học' : 'bình luận';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <Flag className="h-5 w-5" />
            <DialogTitle>Báo cáo vi phạm {targetLabel}</DialogTitle>
          </div>
          <DialogDescription>
            {targetTitle
              ? `Bạn đang báo cáo: "${targetTitle}". Hãy cung cấp thông tin chi tiết để đội ngũ kiểm duyệt xử lý chính xác.`
              : `Hãy cho chúng tôi biết lý do bạn cho rằng ${targetLabel} này vi phạm tiêu chuẩn cộng đồng.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg ? (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/15 p-3 text-sm text-destructive border border-destructive/30">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          ) : null}

          {/* Reason Select */}
          <div className="space-y-1.5">
            <label htmlFor="report-reason" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Lý do vi phạm <span className="text-destructive">*</span>
            </label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="report-desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mô tả chi tiết vi phạm
            </label>
            <textarea
              id="report-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả cụ thể hành vi vi phạm, thời điểm hoặc nội dung liên quan..."
              className="w-full rounded-lg border border-input bg-background p-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Evidence URLs */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Liên kết chứng cứ / Ảnh chụp (tùy chọn)
            </label>
            <div className="flex gap-2">
              <Input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://example.com/evidence-screenshot.png"
                className="flex-1 text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEvidence}
                className="shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                Thêm
              </Button>
            </div>

            {evidenceList.length > 0 ? (
              <div className="space-y-1 pt-1.5">
                {evidenceList.map((url, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded bg-muted/50 px-2.5 py-1 text-xs"
                  >
                    <span className="truncate max-w-[340px] text-muted-foreground">{url}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEvidence(idx)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Xóa chứng cứ"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Hủy
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? 'Đang gửi...' : 'Gửi báo cáo vi phạm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
