import { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface VideoPlayerCardProps {
  videoUrl?: string;
  title?: string;
  caption?: string;
  thumbnailUrl?: string;
  duration?: number;
  className?: string;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function VideoPlayerCard({
  videoUrl,
  title = 'Video minh họa',
  caption,
  duration = 615, // 10:15 as in mockup
  className,
}: VideoPlayerCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(204); // 03:24 as in mockup
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const totalDuration = duration > 0 ? duration : 615;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / totalDuration) * 100));

  useEffect(() => {
    let interval: any;
    if (isPlaying && !videoUrl) {
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
  }, [isPlaying, videoUrl, totalDuration]);

  const togglePlay = () => {
    if (videoRef.current && videoUrl) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.min(1, Math.max(0, clickX / rect.width));
    const newTime = Math.round(ratio * totalDuration);
    setCurrentTime(newTime);
    if (videoRef.current && videoUrl) {
      videoRef.current.currentTime = newTime;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div
        ref={containerRef}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black/95 border border-border/70 shadow-md select-none group"
      >
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            muted={isMuted}
            onTimeUpdate={(e) => {
              const cur = (e.target as HTMLVideoElement).currentTime;
              setCurrentTime(cur);
            }}
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer"
          />
        ) : (
          /* Simulated Video Preview Poster matching mockup diagram */
          <div
            onClick={togglePlay}
            className="w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer bg-gradient-to-b from-[#181820] via-[#101015] to-[#0a0a0d] relative"
          >
            <div className="space-y-1 z-10 select-none">
              <span className="text-[11px] font-mono tracking-widest uppercase text-amber-500 font-bold">
                CPython Memory Management
              </span>
              <h4 className="text-base sm:text-lg md:text-xl font-extrabold text-white tracking-tight">
                {title ? title.toUpperCase() : 'PYTHON MEMORY MANAGEMENT'}
              </h4>
              <p className="text-xs text-slate-400 font-mono">
                Stack, Reference Counting &amp; Garbage Collection
              </p>
            </div>

            {/* Architecture diagram silhouette */}
            <div className="absolute inset-0 opacity-15 pointer-events-none flex items-center justify-around px-8">
              <div className="w-24 h-36 border border-amber-500/40 rounded-lg flex flex-col justify-around p-1">
                <div className="h-4 bg-amber-500/30 rounded" />
                <div className="h-4 bg-amber-500/20 rounded" />
                <div className="h-4 bg-amber-500/10 rounded" />
              </div>
              <div className="w-32 h-32 rounded-full border border-amber-500/30 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border border-amber-500/20" />
              </div>
            </div>
          </div>
        )}

        {/* Center Circular Play Button (when paused) */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <button
              type="button"
              onClick={togglePlay}
              className="pointer-events-auto h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
              aria-label="Phát video"
            >
              <Play className="h-7 w-7 sm:h-9 sm:w-9 fill-current translate-x-1" />
            </button>
          </div>
        )}

        {/* Bottom Video Controls Bar */}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 sm:p-4 space-y-2 transition-opacity duration-200 z-20',
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          )}
        >
          {/* Progress scrubber bar */}
          <div
            onClick={handleSeek}
            className="w-full h-2 rounded-full bg-white/20 hover:h-2.5 transition-all cursor-pointer relative"
          >
            <div
              className="h-full bg-primary rounded-full relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md border-2 border-primary" />
            </div>
          </div>

          <div className="flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="hover:text-primary transition-colors p-1"
                aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setCurrentTime(0)}
                className="hover:text-primary transition-colors p-1"
                title="Xem lại từ đầu"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <div className="font-mono text-[11px] select-none text-slate-300">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="hover:text-primary transition-colors p-1"
                aria-label={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="hover:text-primary transition-colors p-1"
                title="Toàn màn hình"
              >
                <Maximize className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {caption && (
        <p className="text-xs text-center text-muted-foreground italic px-2">{caption}</p>
      )}
    </div>
  );
}
