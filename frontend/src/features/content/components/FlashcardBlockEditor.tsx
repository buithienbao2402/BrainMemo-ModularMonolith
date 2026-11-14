import { useState } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  RotateCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/shared/ui';

export interface FlashcardItem {
  front?: string;
  back?: string;
}

interface FlashcardBlockEditorProps {
  flashcards: FlashcardItem[];
  aiReviewStatus?: 'NOT_APPLICABLE' | 'PENDING' | 'APPROVED';
  onUpdate: (updates: {
    flashcards: FlashcardItem[];
    aiReviewStatus?: 'NOT_APPLICABLE' | 'PENDING' | 'APPROVED';
  }) => void;
}

export function FlashcardBlockEditor({
  flashcards = [],
  aiReviewStatus = 'NOT_APPLICABLE',
  onUpdate,
}: FlashcardBlockEditorProps) {
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);

  const handleAddCard = () => {
    const updated = [...flashcards, { front: '', back: '' }];
    onUpdate({ flashcards: updated });
  };

  const handleRemoveCard = (index: number) => {
    const updated = flashcards.filter((_, i) => i !== index);
    onUpdate({ flashcards: updated });
    if (flippedIndex === index) setFlippedIndex(null);
  };

  const handleCardChange = (index: number, field: 'front' | 'back', value: string) => {
    const updated = flashcards.map((card, i) =>
      i === index ? { ...card, [field]: value } : card
    );
    onUpdate({ flashcards: updated });
  };

  const handleApproveAi = () => {
    onUpdate({ flashcards, aiReviewStatus: 'APPROVED' });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      {/* Header with AI status banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">
            Bộ thẻ nhớ Flashcard ({flashcards.length} thẻ)
          </h4>
        </div>

        {/* AI Review Status Tag */}
        {aiReviewStatus === 'PENDING' && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Thẻ sinh bởi AI (Chờ duyệt)</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleApproveAi}
              className="h-6 px-2 text-[11px] bg-background text-foreground hover:bg-muted"
            >
              <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" />
              Phê duyệt
            </Button>
          </div>
        )}

        {aiReviewStatus === 'APPROVED' && (
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Đã duyệt nội dung</span>
          </div>
        )}
      </div>

      {/* Cards List */}
      <div className="space-y-3">
        {flashcards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            Chưa có thẻ ghi nhớ nào. Nhấn &quot;Thêm thẻ mới&quot; để bắt đầu soạn bộ nhớ lặp lại ngắt quãng (SRS).
          </div>
        ) : (
          flashcards.map((card, idx) => {
            const isFlipped = flippedIndex === idx;
            return (
              <div
                key={idx}
                className="group rounded-xl border border-border bg-muted/20 p-3.5 transition-all hover:border-primary/40 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                    Thẻ #{idx + 1}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFlippedIndex(isFlipped ? null : idx)}
                      title="Lật thẻ thử nghiệm"
                      aria-label="Lật thẻ"
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <RotateCw className="h-3 w-3" />
                      <span>{isFlipped ? 'Mặt sau' : 'Mặt trước'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveCard(idx)}
                      title="Xóa thẻ"
                      aria-label={`Xóa thẻ ${idx + 1}`}
                      className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Front Side */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                      Mặt trước (Khái niệm / Câu hỏi)
                    </label>
                    <textarea
                      value={card.front}
                      onChange={(e) => handleCardChange(idx, 'front', e.target.value)}
                      placeholder="Nhập thuật ngữ, câu hỏi hoặc từ vựng..."
                      rows={2}
                      aria-label={`Mặt trước thẻ ${idx + 1}`}
                      className="w-full rounded-lg border border-border bg-background p-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>

                  {/* Back Side */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                      Mặt sau (Định nghĩa / Đáp án)
                    </label>
                    <textarea
                      value={card.back}
                      onChange={(e) => handleCardChange(idx, 'back', e.target.value)}
                      placeholder="Nhập định nghĩa, lời giải thích hoặc ý nghĩa..."
                      rows={2}
                      aria-label={`Mặt sau thẻ ${idx + 1}`}
                      className="w-full rounded-lg border border-border bg-background p-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddCard}
          className="text-xs w-full sm:w-auto"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Thêm thẻ ghi nhớ
        </Button>
      </div>
    </div>
  );
}
