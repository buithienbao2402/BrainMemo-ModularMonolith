import { HelpCircle, CheckSquare } from 'lucide-react';
import { Input } from '@/shared/ui';

interface QuestionBlockEditorProps {
  title?: string | null;
  questionId?: string | null;
  onUpdate: (updates: { title?: string | null; questionId?: string | null }) => void;
}

export function QuestionBlockEditor({
  title,
  questionId,
  onUpdate,
}: QuestionBlockEditorProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 border-b border-border pb-2.5">
        <HelpCircle className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">
          Câu hỏi thực hành tại chỗ (Single Question)
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">
            Tiêu đề / Ghi chú câu hỏi
          </label>
          <Input
            value={title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Ví dụ: Kiểm tra nhanh bài 1..."
            className="text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">
            Mã định danh câu hỏi (UUID từ ngân hàng)
          </label>
          <Input
            value={questionId || ''}
            onChange={(e) => onUpdate({ questionId: e.target.value })}
            placeholder="Nhập questionId (UUIDv7)..."
            className="text-sm font-mono text-xs"
          />
        </div>
      </div>

      <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex items-center gap-2">
        <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" />
        <span>
          Câu hỏi này sẽ được hiển thị ngay trong bài đọc để học viên làm bài củng cố kiến thức trước khi chuyển sang khối tiếp theo.
        </span>
      </div>
    </div>
  );
}
