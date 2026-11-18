import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import { CalloutCard } from './CalloutCard';
import { CodeBlockCard } from './CodeBlockCard';
import { VideoPlayerCard } from './VideoPlayerCard';
import { AudioPlayerCard } from './AudioPlayerCard';
import { AttachmentCard } from './AttachmentCard';
import { ComparisonTableCard } from './ComparisonTableCard';

const SAMPLE_PYTHON_CODE = `def make_fibonacci_memo():
    # Enclosing scope (Nonlocal storage)
    memo = {0: 0, 1: 1}
    
    def fib(n: int) -> int:
        if n not in memo:
            memo[n] = fib(n - 1) + fib(n - 2)
        return memo[n]
        
    return fib

fib_calc = make_fibonacci_memo()
print(fib_calc(10))  # Tính toán cực tốc O(N)`;

export function SeamlessSampleLesson() {
  // Flashcard 3D flip state
  const [isFlipped, setIsFlipped] = useState(false);

  // Practice question state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const isCorrect = selectedOption === 'B';

  return (
    <article className="space-y-10 text-foreground">
      {/* ========================================================
          PHẦN 1: Khái niệm Hàm và Triết lý DRY
      ======================================================== */}
      <section className="space-y-5">
        <div className="flex items-center gap-2.5 text-base sm:text-lg md:text-xl font-bold text-foreground">
          <div className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 fill-emerald-500/20 text-emerald-500" />
          </div>
          <h2 className="tracking-tight font-extrabold text-foreground">
            1. Khái niệm Hàm và Triết lý DRY
          </h2>
        </div>

        <div className="space-y-4 text-sm sm:text-base leading-relaxed text-foreground/90">
          <p>
            Trong quá trình phát triển phần mềm hiện đại, hàm (function) đóng vai trò là khối xây dựng cơ sở
            (building block) quan trọng nhất. Một hàm chuẩn mực không chỉ giải quyết một tác vụ đơn lẻ (
            <strong className="text-foreground font-bold">Single Responsibility Principle</strong>) mà còn hiện
            thực hóa triệt để nguyên lý{' '}
            <strong className="text-amber-500 dark:text-amber-400 font-bold">DRY (Don&apos;t Repeat Yourself)</strong>.
          </p>

          <p>
            Việc cô lập logic phức tạp vào các hàm con đem lại ba lợi điểm then chốt: tăng khả năng tái sử dụng,
            giảm thiểu phân mảnh logic khi mở rộng hệ thống, và thiết lập ranh giới dữ liệu rõ ràng thông qua
            không gian tên cục bộ.
          </p>

          <div className="pt-1 space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-1" />
              <p className="font-semibold text-foreground">
                Khi thiết kế hàm trong kiến trúc Pythonic, cần nghiêm túc tuân thủ các quy chuẩn sau:
              </p>
            </div>
            <ul className="pl-6 space-y-1.5 text-xs sm:text-sm list-disc text-foreground/85">
              <li>
                <strong className="text-foreground">Pure Function (Hàm thuần khiết):</strong> Đầu ra chỉ phụ thuộc
                vào đối số đầu vào, không tạo ra side-effect ngoài bộ nhớ.
              </li>
              <li>
                <strong className="text-foreground">Tính đóng gói:</strong> Sử dụng cục bộ các biến đếm, không đọc
                hoặc ghi đè tùy tiện lên global namespace.
              </li>
            </ul>
          </div>
        </div>

        {/* Callout Card */}
        <CalloutCard
          tag="First-class citizen 1"
          quote="Độ phức tạp là kẻ thù lớn nhất của phần mềm. Bằng các giới hạn phạm vi tác động của biến trong từng giới hạn, bạn giảm thiểu được 80% lỗi tiềm ẩn liên quan đến state."
        />

        {/* Memoization Python Code Block */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Ví dụ về hàm đệ quy có ghi nhớ trạng thái (Memoization) bằng Closure:</span>
          </div>

          <CodeBlockCard
            code={SAMPLE_PYTHON_CODE}
            language="python"
          />
        </div>
      </section>

      {/* ========================================================
          PHẦN 2: Thứ bậc tìm kiếm biến (LEGB Rule)
      ======================================================== */}
      <section className="space-y-5">
        <div className="flex items-center gap-2.5 text-base sm:text-lg md:text-xl font-bold text-foreground">
          <div className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 fill-emerald-500/20 text-emerald-500" />
          </div>
          <h2 className="tracking-tight font-extrabold text-foreground">
            2. Thứ bậc tìm kiếm biến (LEGB Rule)
          </h2>
        </div>

        <p className="text-sm sm:text-base leading-relaxed text-foreground/90">
          Khi một định danh (variable name) được gọi trong runtime, trình thông dịch Python sẽ quét tuần tự theo 4
          cấp độ không gian tên từ trong ra ngoài:{' '}
          <strong className="text-foreground font-semibold">Local &rarr; Enclosing &rarr; Global &rarr; Built-in</strong>.
        </p>

        {/* Diagram Card matching Mockup */}
        <div className="rounded-2xl border border-border/80 bg-[#12131a] dark:bg-[#0c0d12] p-6 text-center shadow-md space-y-4 my-4">
          <div className="max-w-md mx-auto aspect-[16/10] rounded-xl bg-gradient-to-br from-black/80 to-[#181822] border border-amber-500/20 p-5 flex flex-col items-center justify-center relative overflow-hidden select-none">
            <div className="text-[11px] font-mono uppercase tracking-widest text-amber-500 font-bold mb-3">
              Python LEGB Scope Resolution
            </div>

            {/* Concentric rings visualization */}
            <div className="relative w-40 h-40 rounded-full border border-dashed border-slate-600 flex items-center justify-center">
              <span className="absolute top-1 text-[8px] font-mono text-slate-400 uppercase tracking-wider">
                Built-in
              </span>
              <div className="w-32 h-32 rounded-full border border-amber-500/40 flex items-center justify-center relative">
                <span className="absolute top-1 text-[8px] font-mono text-amber-400 uppercase tracking-wider">
                  Global
                </span>
                <div className="w-24 h-24 rounded-full border border-purple-500/50 flex items-center justify-center relative bg-purple-500/5">
                  <span className="absolute top-1 text-[8px] font-mono text-purple-400 uppercase tracking-wider">
                    Enclosing
                  </span>
                  <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center shadow-md">
                    <span className="text-[9px] font-bold text-primary uppercase">Local</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-400 mt-3 flex items-center gap-1.5">
              <span className="text-primary font-bold">Local</span>
              <span>&rarr;</span>
              <span className="text-purple-400 font-bold">Enclosing</span>
              <span>&rarr;</span>
              <span className="text-amber-400 font-bold">Global</span>
              <span>&rarr;</span>
              <span className="text-slate-300 font-bold">Built-in</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground italic font-medium">
            Hình 4.1: Sơ đồ trực quan Call Stack và mô hình LEGB trong Python Runtime
          </p>
        </div>
      </section>

      {/* ========================================================
          PHẦN 3: Video minh họa: Vòng đời biến và Garbage Collection
      ======================================================== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5 text-base sm:text-lg md:text-xl font-bold text-foreground">
          <div className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 fill-emerald-500/20 text-emerald-500" />
          </div>
          <h2 className="tracking-tight font-extrabold text-foreground">
            3. Video minh họa: Vòng đời biến và Garbage Collection
          </h2>
        </div>

        <p className="text-sm sm:text-base leading-relaxed text-foreground/90">
          Theo dõi diễn giải trực quan cách CPython cấp phát và thu hồi con trỏ biến khi một hàm hoàn tất execution frame:
        </p>

        <VideoPlayerCard
          title="Python Memory Management"
          caption="Stack, Reference Counting & Garbage Collection"
          duration={910} // 15:10
        />
      </section>

      {/* ========================================================
          PHẦN 4: Tóm thu tóm lược (Audio Recap) & Attachment
      ======================================================== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5 text-base sm:text-lg md:text-xl font-bold text-foreground">
          <div className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 fill-emerald-500/20 text-emerald-500" />
          </div>
          <h2 className="tracking-tight font-extrabold text-foreground">
            4. Tóm thu tóm lược (Audio Recap)
          </h2>
        </div>

        <AudioPlayerCard
          title="Audio Recap: Khi nào nên sử dụng Closure thay vì Class?"
          duration={510} // 08:30
        />

        <AttachmentCard
          fileName="bai-tap-mau-closure.zip"
          fileSize="2.4 MB"
        />
      </section>

      {/* ========================================================
          PHẦN 5: So sánh đối số biến thiên: *args và **kwargs
      ======================================================== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5 text-base sm:text-lg md:text-xl font-bold text-foreground">
          <div className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 fill-emerald-500/20 text-emerald-500" />
          </div>
          <h2 className="tracking-tight font-extrabold text-foreground">
            5. So sánh đối số biến thiên: *args và **kwargs
          </h2>
        </div>

        <p className="text-sm sm:text-base leading-relaxed text-foreground/90">
          Khi hàm cần tiếp nhận số lượng đối số động chưa xác định trước:
        </p>

        <ComparisonTableCard />
      </section>

      {/* ========================================================
          PHẦN 6: Flashcard ghi nhớ kiến thức
      ======================================================== */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-primary">
            <Layers className="h-4 w-4" />
            Thẻ ghi nhớ (1/1)
          </span>
          <span className="text-[11px]">Nhấn thẻ để lật mặt</span>
        </div>

        {/* 3D Flip Card */}
        <div
          className="relative w-full h-56 sm:h-64 cursor-pointer select-none"
          style={{ perspective: '1000px' }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div
            className="relative w-full h-full rounded-2xl transition-transform duration-500 shadow-md"
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front Side */}
            <div
              className="absolute inset-0 w-full h-full rounded-2xl bg-card border-2 border-primary/30 p-6 flex flex-col justify-between"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Mặt trước (Câu hỏi / Khái niệm)
              </span>
              <div className="text-center my-auto px-4">
                <p className="text-base sm:text-xl font-bold text-foreground">
                  Closure trong Python được tạo ra khi nào?
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
                  Closure xuất hiện khi một hàm lồng nhau (inner function) tham chiếu đến biến thuộc phạm vi của hàm bao ngoài (enclosing scope) và hàm ngoài trả về chính hàm lồng đó.
                </p>
              </div>
              <div className="flex items-center justify-center text-xs text-muted-foreground gap-1.5 font-medium">
                <RotateCcw className="h-3.5 w-3.5 text-primary" />
                <span>Bấm để quay lại câu hỏi</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          PHẦN 7: Câu hỏi thực hành trắc nghiệm
      ======================================================== */}
      <section className="space-y-4 pt-2 bg-muted/20 p-5 sm:p-7 rounded-2xl border border-border/80">
        <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
          <HelpCircle className="h-4 w-4" />
          <span>Câu hỏi thực hành</span>
        </div>

        <p className="font-bold text-sm sm:text-base text-foreground leading-snug">
          Quy tắc tìm kiếm biến LEGB viết tắt của những từ nào?
        </p>

        <div className="space-y-2.5 pt-1">
          {[
            { id: 'A', text: 'Line, Element, Global, Binary' },
            { id: 'B', text: 'Local, Enclosing, Global, Built-in' },
            { id: 'C', text: 'Logic, Execution, Garbage, Base' },
          ].map((opt) => {
            const isSelected = selectedOption === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => {
                  setSelectedOption(opt.id);
                  setIsSubmitted(false);
                }}
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
                  {opt.id}.
                </span>
                <span className="flex-1">{opt.text}</span>
              </div>
            );
          })}
        </div>

        <div className="pt-2 space-y-3">
          <Button
            type="button"
            size="sm"
            onClick={() => setIsSubmitted(true)}
            disabled={!selectedOption}
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs"
          >
            Kiểm tra kết quả
          </Button>

          {isSubmitted && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 text-xs sm:text-sm animate-in fade-in-50 duration-200 ${
                isCorrect
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
              }`}
            >
              {isCorrect ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-bold">
                  {isCorrect ? 'Chính xác!' : 'Chưa chính xác'}
                </p>
                <p className="leading-relaxed opacity-95">
                  {isCorrect
                    ? 'LEGB là thứ tự quét phạm vi biến trong Python: Local (hàm hiện tại) -> Enclosing (hàm bao ngoài) -> Global (toàn cục file) -> Built-in (các hàm/kiểu có sẵn của Python).'
                    : 'Đáp án đúng là B (Local, Enclosing, Global, Built-in).'}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </article>
  );
}
