import { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface AudioPlayerCardProps {
  title?: string;
  audioUrl?: string;
  duration?: number; // in seconds
  caption?: string;
  className?: string;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayerCard({
  title = 'Audio Recap: Khi nào nên sử dụng Closure thay vì Class?',
  audioUrl,
  duration = 500, // 8:20 default
  caption,
  className,
}: AudioPlayerCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(255); // 04:15 default as in mockup
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate realistic pseudo waveform heights
  const waveformBars = useMemo(() => {
    const barsCount = 38;
    const heights = [
      8, 14, 18, 12, 22, 16, 26, 20, 14, 24, 28, 18, 12, 20, 24, 16,
      28, 22, 14, 20, 26, 18, 12, 22, 28, 16, 20, 24, 14, 18, 22, 16,
      24, 18, 12, 16, 10, 6,
    ];
    return Array.from({ length: barsCount }, (_, i) => heights[i % heights.length] ?? 14);
  }, []);

  const totalDuration = duration > 0 ? duration : 500;
  const progressRatio = Math.min(1, Math.max(0, currentTime / totalDuration));

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalDuration]);

  const togglePlay = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {});
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (index: number) => {
    const targetRatio = index / waveformBars.length;
    const newTime = Math.round(targetRatio * totalDuration);
    setCurrentTime(newTime);
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = newTime;
    }
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 transition-all shadow-xs space-y-3',
        className
      )}
    >
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          muted={isMuted}
          onTimeUpdate={(e) => {
            const cur = (e.target as HTMLAudioElement).currentTime;
            setCurrentTime(cur);
          }}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Big Orange Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Tạm dừng audio' : 'Phát audio'}
          className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="h-5 w-5 fill-current translate-x-0.5" />
          )}
        </button>

        {/* Track Title, Waveform and Timestamps */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-xs sm:text-sm text-foreground truncate">
              {title}
            </h4>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-[11px] sm:text-xs text-muted-foreground select-none">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              >
                {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Interactive Waveform Bar Visualizer */}
          <div
            className="flex items-center gap-1 sm:gap-1.5 h-8 py-1 px-1 rounded-lg bg-muted/30 cursor-pointer select-none"
            title="Nhấn vào thanh sóng để nhảy đến đoạn nghe"
          >
            {waveformBars.map((height, idx) => {
              const barRatio = idx / waveformBars.length;
              const isPast = barRatio <= progressRatio;
              return (
                <div
                  key={idx}
                  onClick={() => handleSeek(idx)}
                  className="flex-1 flex items-center justify-center h-full group"
                >
                  <div
                    style={{ height: `${height}px` }}
                    className={cn(
                      'w-full max-w-[4px] rounded-full transition-colors duration-150 group-hover:bg-primary',
                      isPast
                        ? 'bg-primary'
                        : 'bg-muted-foreground/30 dark:bg-muted-foreground/20'
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {caption && (
        <p className="text-xs text-muted-foreground italic pt-1 pl-1">{caption}</p>
      )}
    </div>
  );
}
