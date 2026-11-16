import { useState } from 'react';
import {
  CheckCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Layers,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import type { LearnBlockDto } from '../api/learningApi';
import { useCompleteBlockMutation, useAnswerPracticeQuestionMutation } from '../api/learningApi';

interface BlockRendererProps {
  courseId: string;
  block: LearnBlockDto;
  canSaveProgress: boolean;
}

export function BlockRenderer({ courseId, block, canSaveProgress }: BlockRendererProps) {
  const { mutateAsync: completeBlock, isPending: isCompleting } = useCompleteBlockMutation(courseId);
  const { mutateAsync: answerPractice, isPending: isAnswering } = useAnswerPracticeQuestionMutation(
    courseId,
    block.id
  );

  // FLASHCARD state
  const flashcards = block.flashcards || [];
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // QUESTION state
  const question = block.question;
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<{
    isCorrect?: boolean | null;
    explanation?: string | null;
  } | null>(null);

  const handleMarkComplete = async () => {
    if (!canSaveProgress) return;
    try {
      await completeBlock(block.id);
    } catch {
      // ignore
    }
  };

  const handleFlipCard = () => {
    setIsCardFlipped(!isCardFlipped);
  };

  const handleNextCard = () => {
    setIsCardFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % (flashcards.length || 1));
  };

  const handlePrevCard = () => {
    setIsCardFlipped(false);
    setCurrentCardIndex((prev) => (prev - 1 + flashcards.length) % (flashcards.length || 1));
  };

  const handleCheckQuestionAnswer = async () => {
    if (!selectedOptionId) return;
    try {
      const res = await answerPractice({
        selectedOptionIds: [selectedOptionId],
      });
      setAnswerResult(res);
      if (canSaveProgress && res.isCorrect) {
        completeBlock(block.id).catch(() => {});
      }
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`bg-card border rounded-2xl p-5 sm:p-6 transition-all shadow-xs space-y-4 ${
        block.completed ? 'border-emerald-500/30 dark:border-emerald-500/20' : 'border-border/70'
      }`}
    >
      {/* Block Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
            {block.blockType}
          </span>
          {block.title && (
            <h3 className="font-semibold text-foreground text-sm sm:text-base">{block.title}</h3>
          )}
        </div>

        {canSaveProgress && (
          <div className="flex items-center gap-1.5">
            {block.completed ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Đã hoàn thành</span>
              </span>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleMarkComplete}
                disabled={isCompleting}
                className="h-7 text-xs rounded-lg"
              >
                {isCompleting ? 'Đang lưu...' : 'Đánh dấu xong'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Block Body Content based on Type */}
      <div className="prose dark:prose-invert max-w-none text-foreground text-sm leading-relaxed">
        {/* 1. RICH_TEXT */}
        {block.blockType === 'RICH_TEXT' && block.body && (
          <div
            className="space-y-3"
            dangerouslySetInnerHTML={{ __html: block.body }}
          />
        )}

        {/* 2. MARKDOWN */}
        {block.blockType === 'MARKDOWN' && block.body && (
          <div className="whitespace-pre-wrap font-sans bg-muted/30 p-4 rounded-xl border border-border/50">
            {block.body}
          </div>
        )}

        {/* 3. IMAGE */}
        {block.blockType === 'IMAGE' && block.resourceUrl && (
          <div className="space-y-2">
            <img
              src={block.resourceUrl}
              alt={block.title || 'Hình ảnh bài học'}
              className="rounded-xl max-h-96 w-auto object-cover border border-border/60 mx-auto"
            />
            {block.body && (
              <p className="text-xs text-center text-muted-foreground italic">{block.body}</p>
            )}
          </div>
        )}

        {/* 4. VIDEO */}
        {block.blockType === 'VIDEO' && block.resourceUrl && (
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-border">
            <video src={block.resourceUrl} controls className="w-full h-full object-contain" />
          </div>
        )}

        {/* 5. AUDIO */}
        {block.blockType === 'AUDIO' && block.resourceUrl && (
          <div className="p-4 bg-muted/30 rounded-xl border border-border/60 space-y-2">
            <audio src={block.resourceUrl} controls className="w-full" />
            {block.body && <p className="text-xs text-muted-foreground">{block.body}</p>}
          </div>
        )}

        {/* 6. FILE */}
        {block.blockType === 'FILE' && (
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">{block.title || 'Tài liệu đính kèm'}</p>
                <p className="text-xs text-muted-foreground">{block.body || 'Tải tệp tin về máy'}</p>
              </div>
            </div>
            {block.resourceUrl && (
              <a
                href={block.resourceUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Tải về</span>
              </a>
            )}
          </div>
        )}

        {/* 7. FLASHCARD INTERACTIVE 3D FLIP */}
        {block.blockType === 'FLASHCARD' && flashcards.length > 0 && (
          <div className="space-y-4 not-prose">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <Layers className="h-4 w-4 text-primary" />
                Thẻ ghi nhớ ({currentCardIndex + 1}/{flashcards.length})
              </span>
              <span className="text-[11px]">Nhấn thẻ để lật mặt</span>
            </div>

            {/* 3D Flip Card Container */}
            <div
              className="relative w-full h-64 sm:h-72 cursor-pointer select-none"
              style={{ perspective: '1000px' }}
              onClick={handleFlipCard}
            >
              <div
                className="relative w-full h-full rounded-2xl transition-transform duration-500 shadow-md"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* Front Side */}
                <div
                  className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-card to-muted/50 border-2 border-primary/30 p-6 flex flex-col justify-between"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Mặt trước (Câu hỏi / Khái niệm)
                  </span>
                  <div className="text-center my-auto px-4">
                    <p className="text-base sm:text-lg font-semibold text-foreground">
                      {flashcards[currentCardIndex]?.frontText ||
                        (flashcards[currentCardIndex] as any)?.front ||
                        'Khái niệm'}
                    </p>
                  </div>
                  <div className="flex items-center justify-center text-xs text-muted-foreground gap-1">
                    <RotateCcw className="h-3.5 w-3.5 text-primary" />
                    <span>Bấm để lật giải nghĩa</span>
                  </div>
                </div>

                {/* Back Side */}
                <div
                  className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-primary/10 to-card border-2 border-primary/50 p-6 flex flex-col justify-between"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Mặt sau (Giải thích / Ý nghĩa)
                  </span>
                  <div className="text-center my-auto px-4">
                    <p className="text-sm sm:text-base font-medium text-foreground leading-relaxed">
                      {flashcards[currentCardIndex]?.backText ||
                        (flashcards[currentCardIndex] as any)?.back ||
                        'Giải nghĩa'}
                    </p>
                  </div>
                  <div className="flex items-center justify-center text-xs text-muted-foreground gap-1">
                    <RotateCcw className="h-3.5 w-3.5 text-primary" />
                    <span>Bấm để quay lại câu hỏi</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Flashcard Controls */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrevCard}
                disabled={flashcards.length <= 1}
                className="h-8 px-3 text-xs"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Thẻ trước
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFlipCard}
                className="h-8 px-3 text-xs text-primary font-medium"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Lật thẻ
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleNextCard}
                disabled={flashcards.length <= 1}
                className="h-8 px-3 text-xs"
              >
                Thẻ sau
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* 8. PRACTICE QUESTION */}
        {block.blockType === 'QUESTION' && question && (
          <div className="space-y-4 not-prose bg-muted/20 p-5 rounded-2xl border border-border/70">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
              <HelpCircle className="h-4 w-4" />
              <span>Câu hỏi thực hành</span>
            </div>

            <p className="font-semibold text-sm sm:text-base text-foreground leading-snug">
              {question.stem}
            </p>

            {/* Options list */}
            {question.options && question.options.length > 0 && (
              <div className="space-y-2 pt-1">
                {question.options.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/10 font-medium text-foreground shadow-xs'
                          : 'border-border/60 hover:bg-muted/50 text-foreground/90'
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
                        }`}
                      >
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <span>{opt.content}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Check Answer Button & Feedback Callout */}
            <div className="pt-2 space-y-3">
              <Button
                type="button"
                size="sm"
                onClick={handleCheckQuestionAnswer}
                disabled={isAnswering || !selectedOptionId}
                className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-2"
              >
                {isAnswering ? 'Đang chấm...' : 'Kiểm tra đáp án'}
              </Button>

              {answerResult && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs sm:text-sm animate-in fade-in-50 duration-200 ${
                    answerResult.isCorrect
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {answerResult.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {answerResult.isCorrect ? 'Chính xác!' : 'Chưa chính xác'}
                    </p>
                    {answerResult.explanation && (
                      <p className="leading-relaxed opacity-90">{answerResult.explanation}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
