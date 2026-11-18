import { useState } from 'react';
import {
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Layers,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import { isRichDocumentJsonString, richJsonToHtml } from '@/features/content/lib/richTextDocument';
import type { LearnBlockDto } from '../api/learningApi';
import { useCompleteBlockMutation, useAnswerPracticeQuestionMutation } from '../api/learningApi';
import { QuizBlockCard } from './QuizBlockCard';
import { AudioPlayerCard } from './AudioPlayerCard';
import { VideoPlayerCard } from './VideoPlayerCard';
import { AttachmentCard } from './AttachmentCard';

interface BlockRendererProps {
  courseId: string;
  block: LearnBlockDto;
  canSaveProgress: boolean;
  blockIndex?: number;
}

export function BlockRenderer({
  courseId,
  block,
  canSaveProgress,
  blockIndex,
}: BlockRendererProps) {
  const { mutateAsync: completeBlock } = useCompleteBlockMutation(courseId);
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

  const displayIndex = typeof blockIndex === 'number' ? blockIndex + 1 : block.position;
  const normalizedType = (block.blockType || '').replace(/_/g, '').toUpperCase();
  const isRichText = normalizedType === 'RICHTEXT' || normalizedType === 'RICH_TEXT';

  const renderedHtml = isRichText && block.body
    ? (isRichDocumentJsonString(block.body) ? richJsonToHtml(block.body) : block.body)
    : '';

  return (
    <section className="space-y-4 my-6">
      {/* Seamless Section Heading if title is provided */}
      {block.title && (
        <div className="flex items-center gap-2.5 pt-4 pb-1 text-base sm:text-lg md:text-xl font-bold text-foreground">
          <div className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 fill-emerald-500/20 text-emerald-500" />
          </div>
          <h3 className="tracking-tight">
            {displayIndex ? `${displayIndex}. ` : ''}
            {block.title}
          </h3>
        </div>
      )}

      {/* Block Content - Flowing continuously without boxed borders */}
      {/* 1. RICH_TEXT */}
      {isRichText && renderedHtml && (
        <div
          className="prose dark:prose-invert max-w-none text-foreground text-sm sm:text-base leading-relaxed space-y-4"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      )}

      {/* 2. MARKDOWN */}
      {normalizedType === 'MARKDOWN' && block.body && (
        <div className="whitespace-pre-wrap font-sans text-foreground/90 leading-relaxed text-sm sm:text-base space-y-3">
          {block.body}
        </div>
      )}

      {/* 3. IMAGE */}
      {normalizedType === 'IMAGE' && block.resourceUrl && (
        <div className="space-y-2.5 my-6">
          <div className="rounded-2xl overflow-hidden border border-border/70 bg-black/5 dark:bg-black/30 shadow-xs">
            <img
              src={block.resourceUrl}
              alt={block.title || 'Hình ảnh bài học'}
              className="rounded-2xl max-h-[480px] w-auto mx-auto object-contain transition-transform hover:scale-[1.01]"
            />
          </div>
          {block.body && (
            <p className="text-xs text-center text-muted-foreground italic font-medium">
              {block.body}
            </p>
          )}
        </div>
      )}

      {/* 4. VIDEO (VideoPlayerCard) */}
      {normalizedType === 'VIDEO' && (
        <div className="my-6">
          <VideoPlayerCard
            videoUrl={block.resourceUrl}
            title={block.title}
            caption={block.body}
          />
        </div>
      )}

      {/* 5. AUDIO (AudioPlayerCard) */}
      {normalizedType === 'AUDIO' && (
        <div className="my-6">
          <AudioPlayerCard
            audioUrl={block.resourceUrl}
            title={block.title}
            caption={block.body}
          />
        </div>
      )}

      {/* 6. FILE (AttachmentCard) */}
      {normalizedType === 'FILE' && (
        <div className="my-4">
          <AttachmentCard
            fileName={block.title || 'bai-tap-mau-closure.zip'}
            fileSize="2.4 MB"
            downloadUrl={block.resourceUrl}
          />
        </div>
      )}

      {/* 7. FLASHCARD INTERACTIVE 3D FLIP */}
      {normalizedType === 'FLASHCARD' && flashcards.length > 0 && (
        <div className="space-y-4 my-8 not-prose">
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
                className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-card to-muted/40 border-2 border-primary/30 p-6 flex flex-col justify-between"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Mặt trước (Câu hỏi / Khái niệm)
                </span>
                <div className="text-center my-auto px-4">
                  <p className="text-base sm:text-lg font-bold text-foreground">
                    {flashcards[currentCardIndex]?.frontText ||
                      (flashcards[currentCardIndex] as any)?.front ||
                      'Khái niệm'}
                  </p>
                </div>
                <div className="flex items-center justify-center text-xs text-muted-foreground gap-1.5 font-medium">
                  <RotateCcw className="h-3.5 w-3.5 text-primary" />
                  <span>Lật thẻ để xem đáp án</span>
                </div>
              </div>

              {/* Back Side */}
              <div
                className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-primary/10 via-card to-card border-2 border-primary/50 p-6 flex flex-col justify-between"
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
                <div className="flex items-center justify-center text-xs text-muted-foreground gap-1.5 font-medium">
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
      {normalizedType === 'QUESTION' && question && (
        <div className="space-y-4 my-8 not-prose bg-muted/20 p-5 sm:p-6 rounded-2xl border border-border/80">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
            <HelpCircle className="h-4 w-4" />
            <span>Câu hỏi thực hành</span>
          </div>

          <p className="font-bold text-sm sm:text-base text-foreground leading-snug">
            {question.stem}
          </p>

          {/* Options list with custom radio styling */}
          {question.options && question.options.length > 0 && (
            <div className="space-y-2.5 pt-1">
              {question.options.map((opt, optIdx) => {
                const isSelected = selectedOptionId === opt.id;
                const letterPrefix = String.fromCharCode(65 + optIdx);
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedOptionId(opt.id)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-xs sm:text-sm transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'border-primary bg-primary/10 font-semibold text-foreground shadow-xs'
                        : 'border-border/70 hover:bg-muted/40 text-foreground/90'
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/60'
                      }`}
                    >
                      {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                    <span className="font-bold text-muted-foreground mr-1">
                      {letterPrefix}.
                    </span>
                    <span className="flex-1">{opt.content}</span>
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
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs"
            >
              {isAnswering ? 'Đang chấm...' : 'Kiểm tra đáp án'}
            </Button>

            {answerResult && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 text-xs sm:text-sm animate-in fade-in-50 duration-200 ${
                  answerResult.isCorrect
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                }`}
              >
                {answerResult.isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold">
                    {answerResult.isCorrect ? 'Chính xác!' : 'Chưa chính xác'}
                  </p>
                  {answerResult.explanation && (
                    <p className="leading-relaxed opacity-95">{answerResult.explanation}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. QUIZ (SCR-LRN-02) */}
      {normalizedType === 'QUIZ' && (
        <div className="not-prose my-6">
          <QuizBlockCard
            courseId={courseId}
            blockId={block.id}
            title={block.title || 'Bài kiểm tra đánh giá'}
            description={block.body}
            timeLimitMinutes={(block.quizSummary as any)?.timeLimitMinutes}
            maxAttempts={(block.quizSummary as any)?.maxAttempts}
            passScorePercent={(block.quizSummary as any)?.passScorePercent}
            hasPassword={(block.quizSummary as any)?.hasPassword}
          />
        </div>
      )}
    </section>
  );
}
