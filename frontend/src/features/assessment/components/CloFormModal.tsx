import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Input } from '@/shared/ui';
import { BloomBadge } from './BloomBadge';

export interface CloFormData {
  id?: string;
  code: string;
  description: string;
  bloomLevelCode: string;
  weight: number;
  assessmentMethod?: string;
}

interface CloFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CloFormData) => Promise<void>;
  initialData?: CloFormData | null;
  defaultCode?: string;
}

const BLOOM_OPTIONS = [
  { code: 'REMEMBER', level: 'C1', label: 'C1 - Nhớ (Remember)' },
  { code: 'UNDERSTAND', level: 'C2', label: 'C2 - Hiểu (Understand)' },
  { code: 'APPLY', level: 'C3', label: 'C3 - Vận dụng (Apply)' },
  { code: 'ANALYZE', level: 'C4', label: 'C4 - Phân tích (Analyze)' },
  { code: 'EVALUATE', level: 'C5', label: 'C5 - Đánh giá (Evaluate)' },
  { code: 'CREATE', level: 'C6', label: 'C6 - Sáng tạo (Create)' },
];

export function CloFormModal({ isOpen, onClose, onSave, initialData, defaultCode }: CloFormModalProps) {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [bloomLevelCode, setBloomLevelCode] = useState('UNDERSTAND');
  const [weight, setWeight] = useState(20);
  const [assessmentMethod, setAssessmentMethod] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setCode(initialData.code);
      setDescription(initialData.description);
      setBloomLevelCode(initialData.bloomLevelCode || 'UNDERSTAND');
      setWeight(initialData.weight ?? 20);
      setAssessmentMethod(initialData.assessmentMethod || '');
    } else {
      setCode(defaultCode || 'CLO1');
      setDescription('');
      setBloomLevelCode('UNDERSTAND');
      setWeight(20);
      setAssessmentMethod('');
    }
  }, [initialData, defaultCode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !description.trim()) return;

    try {
      setIsSubmitting(true);
      await onSave({
        id: initialData?.id,
        code: code.trim(),
        description: description.trim(),
        bloomLevelCode,
        weight: Number(weight) || 0,
        assessmentMethod: assessmentMethod.trim(),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Chỉnh sửa chuẩn đầu ra (CLO)' : 'Thêm mới Chuẩn đầu ra (CLO)'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                Mã CLO <span className="text-destructive">*</span>
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ví dụ: CLO1"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                Tỷ trọng dự kiến (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={weight}
                onChange={(e) => setWeight(Math.max(0, Math.min(100, Number(e.target.value))))}
                placeholder="20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
              Thang nhận thức Bloom <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BLOOM_OPTIONS.map((opt) => {
                const isSelected = bloomLevelCode === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setBloomLevelCode(opt.code)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-[#ff7a1a] bg-[#ff7a1a]/10 text-foreground ring-1 ring-[#ff7a1a]'
                        : 'border-border/70 hover:border-border text-muted-foreground hover:text-foreground bg-card'
                    }`}
                  >
                    <BloomBadge levelCode={opt.code} />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
              Mô tả Chuẩn đầu ra (CLO) <span className="text-destructive">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Hiểu và giải thích được các nguyên lý nền tảng của..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
              Phương pháp đánh giá gợi ý (Đánh giá qua)
            </label>
            <Input
              value={assessmentMethod}
              onChange={(e) => setAssessmentMethod(e.target.value)}
              placeholder="Ví dụ: Quizzes trắc nghiệm thuật toán, Bài kiểm tra Lab 01"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !code.trim() || !description.trim()}
              className="bg-[#ff7a1a] hover:bg-[#e86f17] text-white font-semibold"
            >
              {isSubmitting ? 'Đang lưu...' : initialData ? 'Lưu thay đổi' : '+ Thêm CLO'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
