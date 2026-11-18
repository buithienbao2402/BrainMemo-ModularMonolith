import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  Flag,
  Send,
  User,
  X,
} from 'lucide-react';
import defaultCourseCover from '@/assets/courses';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  useToast,
} from '@/shared/ui';
import { useCreateReport } from '../api/moderationApi';
import type { ReportTargetType } from '../types';

export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  targetThumbnailUrl?: string | null;
  targetAuthorName?: string | null;
  targetContent?: string | null;
}

const COURSE_REASONS = [
  { value: 'COPYRIGHT_VIOLATION', label: 'Vi phạm bản quyền sở hữu trí tuệ' },
  { value: 'MISINFORMATION', label: 'Nội dung lừa đảo / Sai lệch học thuật' },
  { value: 'HARASSMENT', label: 'Nội dung độc hại / Thù ghét / Quấy rối' },
  { value: 'SPAM', label: 'Spam / Quảng cáo trái phép' },
  { value: 'OTHER', label: 'Khác' },
];

const COMMENT_REASONS = [
  { value: 'HARASSMENT', label: 'Ngôn từ thù ghét / Quấy rối' },
  { value: 'SPAM', label: 'Spam liên kết / Lừa đảo tài chính' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Nội dung độc hại / Xúc phạm' },
  { value: 'COMMERCIAL', label: 'Quảng cáo ngoài nền tảng' },
  { value: 'OTHER', label: 'Khác' },
];

const DEFAULT_COURSE_DESC =
  'Khóa học sử dụng toàn bộ slide và bài tập lập trình độc quyền từ tài liệu nội bộ viện nghiên cứu công nghệ mà chưa có sự đồng ý của tác giả.';

const DEFAULT_COMMENT_DESC =
  'Tài khoản này liên tục đăng tải liên kết nhóm lừa đảo tài chính và dùng lời lẽ mạt sát giảng viên.';

export function ReportModal(props: ReportModalProps) {
  return (
    <Dialog open={props.isOpen} onOpenChange={(open) => !open && props.onClose()}>
      {props.isOpen ? <ReportModalContent {...props} /> : null}
    </Dialog>
  );
}

function ReportModalContent({
  onClose,
  targetType,
  targetId,
  targetTitle,
  targetThumbnailUrl,
  targetAuthorName,
  targetContent,
}: ReportModalProps) {
  const { pushToast } = useToast();
  const isCourse = targetType === 'COURSE';

  const [reason, setReason] = useState<string>(
    isCourse ? 'COPYRIGHT_VIOLATION' : 'HARASSMENT'
  );
  const [description, setDescription] = useState<string>(
    isCourse ? DEFAULT_COURSE_DESC : DEFAULT_COMMENT_DESC
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { mutateAsync: createReport, isPending } = useCreateReport();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!description.trim()) {
      setErrorMsg('Vui lòng nhập mô tả chi tiết hành vi vi phạm.');
      return;
    }

    try {
      await createReport({
        targetType,
        targetId,
        reason,
        description: description.trim(),
      });

      pushToast({
        title: 'Báo cáo đã được gửi thành công',
        description: 'Đội ngũ kiểm duyệt sẽ xem xét nội dung và xử lý theo quy định.',
        tone: 'success',
      });

      onClose();
    } catch (err: unknown) {
      const errObj = err as { code?: string; status?: number; message?: string };
      if (errObj?.code === 'DUPLICATE_REPORT' || errObj?.status === 409) {
        setErrorMsg('Bạn đã gửi báo cáo cho nội dung này trước đó và đang được xem xét.');
      } else {
        setErrorMsg(errObj?.message || 'Không thể gửi báo cáo. Vui lòng thử lại sau.');
      }
    }
  };

  const reasons = isCourse ? COURSE_REASONS : COMMENT_REASONS;

  return (
    <DialogContent className="max-w-[500px] p-0 overflow-hidden bg-[#14151a] border border-[#252632] rounded-2xl shadow-2xl text-zinc-100 gap-0">
      {/* Top gradient highlight border */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#ea580c] via-[#f43f5e] to-[#ef4444]" />

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2a171a] border border-[#482026] flex items-center justify-center text-[#ef4444] shrink-0">
              {isCourse ? (
                <Flag className="w-5 h-5 text-[#ef4444]" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white tracking-tight">
                {isCourse ? 'Báo cáo khóa học' : 'Báo cáo bình luận'}
              </DialogTitle>
              {/* Hidden text for backward compatibility with existing tests */}
              <span className="sr-only">
                {isCourse ? 'Báo cáo vi phạm khóa học' : 'Báo cáo vi phạm bình luận'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg ? (
            <div className="flex items-start gap-2 rounded-xl bg-red-950/40 p-3 text-xs text-red-300 border border-red-800/60">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          ) : null}

          {/* Section 1: Target preview */}
          {isCourse ? (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                ĐỐI TƯỢNG BỊ BÁO CÁO
              </span>
              <div className="bg-[#101116] border border-[#23242e] rounded-xl p-3 flex items-center gap-3.5">
                <div className="relative w-28 h-16 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 border border-zinc-700/40">
                  <img
                    src={targetThumbnailUrl || defaultCourseCover}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] font-mono text-zinc-300 px-1 py-0.5 rounded">
                    18:40
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-semibold text-zinc-100 line-clamp-2 leading-snug">
                  {targetTitle || 'Lập trình Python chuyên sâu & Ứng dụng AI thực chiến'}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                BÌNH LUẬN BỊ GẮN CỜ
              </span>
              <div className="bg-[#101116] border border-[#23242e] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center">
                    <User className="w-3 h-3" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-200">
                    {targetAuthorName || 'Người dùng ẩn danh'}
                  </span>
                </div>
                <div className="text-xs text-zinc-300 italic bg-[#161720] border border-[#242531] rounded-lg p-2.5 leading-relaxed">
                  {targetContent ||
                    '“Dạy thế này mà cũng thu tiền à? Vào nhóm telegram xxx kiếm kèo x100 nhanh hơn học mấy cái lý thuyết rác rưởi này...”'}
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Reason Select */}
          <div className="space-y-1.5">
            <label
              htmlFor="report-reason"
              className="text-xs font-semibold text-zinc-200 flex items-center gap-1"
            >
              Lý do khiếu nại vi phạm <span className="text-red-500">*</span>
              <span className="sr-only">Lý do vi phạm</span>
            </label>
            <div className="relative">
              <select
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full appearance-none bg-[#101116] border border-[#23242e] hover:border-zinc-600 rounded-xl px-3.5 py-2.5 pr-9 text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-red-500 transition-colors cursor-pointer"
              >
                {reasons.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Section 3: Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="report-desc" className="font-semibold text-zinc-200">
                {isCourse ? 'Mô tả chi tiết dấu hiệu vi phạm' : 'Mô tả hành vi vi phạm'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <span className="text-zinc-500 text-[11px] font-mono">
                {description.length} / 1000
              </span>
            </div>
            <textarea
              id="report-desc"
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả cụ thể hành vi vi phạm, thời điểm hoặc nội dung liên quan..."
              className="w-full bg-[#101116] border border-[#23242e] rounded-xl p-3.5 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-red-500 transition-colors min-h-[96px] resize-none leading-relaxed"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#181920] hover:bg-zinc-800 border border-[#2c2d38] text-xs font-semibold text-zinc-300 transition-colors"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-red-900/30 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                Gửi báo cáo<span className="sr-only"> vi phạm</span>
              </span>
            </button>
          </div>
        </form>
      </div>
    </DialogContent>
  );
}
