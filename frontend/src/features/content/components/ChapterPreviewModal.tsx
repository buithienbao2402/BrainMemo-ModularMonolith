import { useState } from 'react';
import {
  X,
  Eye,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  HelpCircle,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import type { BlockDto } from '../api/contentApi';

interface ChapterPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterTitle: string;
  chapterDescription?: string | null;
  blocks: BlockDto[];
}

export function ChapterPreviewModal({
  isOpen,
  onClose,
  chapterTitle,
  chapterDescription,
  blocks = [],
}: ChapterPreviewModalProps) {
  // Flashcard carousel active index and flip state per flashcard block
  const [activeCardIndexes, setActiveCardIndexes] = useState<Record<string, number>>({});
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const handleNextCard = (blockId: string, totalCards: number) => {
    const cur = activeCardIndexes[blockId] ?? 0;
    setActiveCardIndexes({ ...activeCardIndexes, [blockId]: (cur + 1) % totalCards });
    setFlippedCards({ ...flippedCards, [blockId]: false });
  };

  const handlePrevCard = (blockId: string, totalCards: number) => {
    const cur = activeCardIndexes[blockId] ?? 0;
    setActiveCardIndexes({
      ...activeCardIndexes,
      [blockId]: (cur - 1 + totalCards) % totalCards,
    });
    setFlippedCards({ ...flippedCards, [blockId]: false });
  };

  const toggleFlip = (blockId: string) => {
    setFlippedCards({ ...flippedCards, [blockId]: !flippedCards[blockId] });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xem trước bài học ở chế độ học viên"
      className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-md p-4 sm:p-6 lg:p-10"
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Preview Top Navigation Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-2xl border border-border bg-card/90 px-5 py-3 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Eye className="h-3.5 w-3.5" />
              Chế độ xem trước nháp (FR-CNT-03)
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Giao diện như học viên nhìn thấy khi học bài
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            aria-label="Đóng xem trước"
            className="text-xs"
          >
            <X className="h-4 w-4 mr-1" />
            Đóng xem trước
          </Button>
        </div>

        {/* Chapter Header */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-3 shadow-xs">
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-foreground">
            {chapterTitle || 'Chương chưa đặt tên'}
          </h1>
          {chapterDescription && (
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {chapterDescription}
            </p>
          )}
        </div>

        {/* Rendered Blocks List */}
        <div className="space-y-6">
          {blocks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
              Chương này chưa có khối nội dung nào. Thêm các khối nội dung vào bản nháp để xem trước.
            </div>
          ) : (
            blocks.map((block) => (
              <div
                key={block.id}
                className="rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-xs"
              >
                {/* 1. Rich Text Block */}
                {block.blockType === 'RICH_TEXT' && (
                  <div
                    className="prose dark:prose-invert max-w-none text-sm sm:text-base text-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: block.body || '<p class="text-muted-foreground italic">Nội dung trống</p>' }}
                  />
                )}

                {/* 2. Markdown Block */}
                {block.blockType === 'MARKDOWN' && (
                  <div className="prose dark:prose-invert max-w-none font-sans text-sm sm:text-base text-foreground">
                    <pre className="p-4 bg-muted/60 rounded-xl font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                      {block.body || 'Nội dung Markdown trống'}
                    </pre>
                  </div>
                )}

                {/* 3. Image Block */}
                {block.blockType === 'IMAGE' && (
                  <figure className="space-y-2 text-center">
                    <div className="rounded-xl border border-border bg-muted/20 p-2 flex items-center justify-center min-h-[180px]">
                      {block.resourceId ? (
                        <div className="p-4 text-center">
                          <p className="text-sm font-semibold text-foreground">
                            [Hình ảnh bài học]
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Resource ID: {block.resourceId}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          Chưa chọn ảnh cho khối này
                        </p>
                      )}
                    </div>
                    {block.title && (
                      <figcaption className="text-xs text-muted-foreground italic">
                        {block.title}
                      </figcaption>
                    )}
                  </figure>
                )}

                {/* 4. Video Block */}
                {block.blockType === 'VIDEO' && (
                  <div className="space-y-2">
                    {block.title && (
                      <h4 className="text-sm font-bold text-foreground">{block.title}</h4>
                    )}
                    <div className="aspect-video rounded-xl bg-black/90 flex flex-col items-center justify-center text-white p-4">
                      <p className="text-sm font-semibold">Khung phát video bài giảng</p>
                      <p className="text-xs text-white/70 mt-1">
                        Resource ID: {block.resourceId || 'Chưa liên kết'}
                      </p>
                    </div>
                  </div>
                )}

                {/* 5. Audio Block */}
                {block.blockType === 'AUDIO' && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      {block.title || 'Bài nghe âm thanh'}
                    </h4>
                    <div className="flex items-center gap-3 bg-card p-3 rounded-lg border border-border">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        ▶
                      </div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-1/3 rounded-full" />
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">01:24 / 04:15</span>
                    </div>
                  </div>
                )}

                {/* 6. File Attachment Block */}
                {block.blockType === 'FILE' && (
                  <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          {block.title || 'Tài liệu đính kèm'}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Nhấn để tải tài liệu tham khảo bài học
                        </p>
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="text-xs">
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Tải xuống
                    </Button>
                  </div>
                )}

                {/* 7. Flashcard Block */}
                {block.blockType === 'FLASHCARD' && (() => {
                  const cards = block.flashcards || [];
                  const activeIdx = activeCardIndexes[block.id] ?? 0;
                  const isFlipped = flippedCards[block.id] ?? false;
                  const curCard = cards[activeIdx];

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <h4 className="text-sm font-bold text-foreground">
                            Thẻ ghi nhớ Flashcard (Lặp lại ngắt quãng SRS)
                          </h4>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                          {cards.length > 0 ? `${activeIdx + 1} / ${cards.length}` : '0 thẻ'}
                        </span>
                      </div>

                      {cards.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          Chưa có thẻ ghi nhớ nào trong khối này.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {/* Interactive Card */}
                          <div
                            onClick={() => toggleFlip(block.id)}
                            className="cursor-pointer min-h-[160px] rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 flex flex-col items-center justify-center text-center transition-all hover:border-primary shadow-xs"
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                              {isFlipped ? 'Mặt sau (Đáp án / Định nghĩa)' : 'Mặt trước (Khái niệm / Câu hỏi)'}
                            </span>
                            <p className="text-base sm:text-lg font-semibold text-foreground leading-relaxed">
                              {isFlipped ? curCard?.back : curCard?.front}
                            </p>
                            <span className="mt-4 flex items-center gap-1 text-[11px] text-muted-foreground">
                              <RotateCw className="h-3 w-3" />
                              Nhấp để lật thẻ
                            </span>
                          </div>

                          {/* Navigation Controls */}
                          <div className="flex items-center justify-center gap-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrevCard(block.id, cards.length)}
                              disabled={cards.length <= 1}
                              className="h-8"
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Trước
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleNextCard(block.id, cards.length)}
                              disabled={cards.length <= 1}
                              className="h-8"
                            >
                              Tiếp theo
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 8. Question Block */}
                {block.blockType === 'QUESTION' && (
                  <div className="rounded-xl border border-border bg-muted/10 p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-purple-500" />
                      <h4 className="text-sm font-bold text-foreground">
                        {block.title || 'Câu hỏi thực hành củng cố'}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Học viên sẽ trả lời câu hỏi trực tiếp tại đây để củng cố kiến thức trước khi hoàn thành bài đọc.
                    </p>
                  </div>
                )}

                {/* 9. Assignment Block */}
                {block.blockType === 'ASSIGNMENT' && (
                  <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <h4 className="text-base font-bold text-foreground">
                        {block.title || 'Bài tập thực hành nộp tệp'}
                      </h4>
                      <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                        {block.assignmentConfig?.maxPoints ?? 10} Điểm
                      </span>
                    </div>

                    {block.body && (
                      <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {block.body}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                      {block.assignmentConfig?.dueAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Hạn chót: {new Date(block.assignmentConfig.dueAt).toLocaleString('vi-VN')}
                        </span>
                      )}
                      <span>
                        Dung lượng tối đa:{' '}
                        {((block.assignmentConfig?.maxFileSizeBytes ?? 10485760) / (1024 * 1024)).toFixed(0)} MB
                      </span>
                    </div>
                  </div>
                )}

                {/* 10. Quiz Block */}
                {block.blockType === 'QUIZ' && (
                  <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-xs">
                    <h4 className="text-base font-bold text-foreground">
                      {block.title || 'Bài kiểm tra đánh giá'}
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="rounded-lg bg-muted/40 p-2.5">
                        <span className="text-muted-foreground block text-[11px]">Thời gian làm bài</span>
                        <span className="font-semibold text-foreground">
                          {block.quizConfig?.timeLimitMinutes
                            ? `${block.quizConfig.timeLimitMinutes} phút`
                            : 'Không giới hạn'}
                        </span>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2.5">
                        <span className="text-muted-foreground block text-[11px]">Ngưỡng đạt</span>
                        <span className="font-semibold text-foreground">
                          {block.quizConfig?.passScore ?? 70}%
                        </span>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2.5">
                        <span className="text-muted-foreground block text-[11px]">Số lượt thử</span>
                        <span className="font-semibold text-foreground">
                          {block.quizConfig?.maxAttempts ?? 'Vô hạn'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
