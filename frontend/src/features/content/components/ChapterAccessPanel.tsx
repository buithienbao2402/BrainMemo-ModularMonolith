import { useState, useEffect } from 'react';
import { Lock, Unlock, Eye, EyeOff, X, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/ui';

interface ChapterAccessPanelProps {
  isOpen: boolean;
  initialMode: 'PUBLIC' | 'PROTECTED';
  initialPasscode?: string;
  isCourseOnlyMe?: boolean;
  onClose: () => void;
  onApply: (mode: 'PUBLIC' | 'PROTECTED', passcode: string) => Promise<void> | void;
  isPending?: boolean;
}

export function ChapterAccessPanel({
  isOpen,
  initialMode,
  initialPasscode = '',
  isCourseOnlyMe = false,
  onClose,
  onApply,
  isPending = false,
}: ChapterAccessPanelProps) {
  const [selectedMode, setSelectedMode] = useState<'PUBLIC' | 'PROTECTED'>(initialMode);
  const [passcode, setPasscode] = useState(initialPasscode);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedMode(initialMode);
      setPasscode(initialPasscode || '');
      setShowPassword(false);
      setErrorMessage('');
    }
  }, [isOpen, initialMode, initialPasscode]);

  if (!isOpen) return null;

  const handleApply = async () => {
    if (selectedMode === 'PROTECTED' && !passcode.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu cho chương.');
      return;
    }
    setErrorMessage('');
    await onApply(selectedMode, passcode.trim());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Panel Chế độ truy cập"
      className="fixed inset-0 z-50 overflow-hidden select-none"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Container on Right */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-auto">
        <div className="w-screen max-w-sm sm:max-w-md bg-card dark:bg-[#16161a] border-l border-border text-foreground flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border/80">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#ff7a1a]/15 text-[#ff7a1a]">
                <Lock className="h-5 w-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                Chế độ truy cập
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng panel chế độ truy cập"
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {/* 1. Radio Card: Public */}
            <div
              onClick={() => {
                setSelectedMode('PUBLIC');
                setErrorMessage('');
              }}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedMode === 'PUBLIC'
                  ? 'border-[#ff7a1a] bg-[#ff7a1a]/5 ring-1 ring-[#ff7a1a]/30'
                  : 'border-border/70 bg-card/60 dark:bg-card/40 hover:border-border hover:bg-muted/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  <div
                    className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                      selectedMode === 'PUBLIC'
                        ? 'border-[#ff7a1a]'
                        : 'border-muted-foreground/60'
                    }`}
                  >
                    {selectedMode === 'PUBLIC' && (
                      <div className="h-2 w-2 rounded-full bg-[#ff7a1a]" />
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Unlock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm text-foreground">
                      Public (Công khai)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Không thêm điều kiện ngoài quyền của khóa học
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Radio Card: Protected */}
            <div
              onClick={() => setSelectedMode('PROTECTED')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedMode === 'PROTECTED'
                  ? 'border-[#ff7a1a] bg-[#ff7a1a]/5 ring-1 ring-[#ff7a1a]/30'
                  : 'border-border/70 bg-card/60 dark:bg-card/40 hover:border-border hover:bg-muted/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  <div
                    className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                      selectedMode === 'PROTECTED'
                        ? 'border-[#ff7a1a]'
                        : 'border-muted-foreground/60'
                    }`}
                  >
                    {selectedMode === 'PROTECTED' && (
                      <div className="h-2 w-2 rounded-full bg-[#ff7a1a]" />
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-[#ff7a1a]" />
                    <span className="font-semibold text-sm text-foreground">
                      Protected (Có mật khẩu)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Học viên cần nhập mật khẩu chương
                  </p>
                </div>
              </div>
            </div>

            {/* Form Mật khẩu chương (Chỉ hiện khi chọn Protected) */}
            {selectedMode === 'PROTECTED' && (
              <div className="space-y-2 pt-2 animate-in fade-in duration-150">
                <label
                  htmlFor="chapter-passcode-input"
                  className="block text-xs font-semibold text-foreground/90"
                >
                  Mật khẩu chương
                </label>
                <div className="relative">
                  {/* Dùng type="text" có WebkitTextSecurity để chống browser lưu mật khẩu */}
                  <input
                    id="chapter-passcode-input"
                    name="bm_chapter_access_key"
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    style={
                      showPassword
                        ? undefined
                        : ({
                            WebkitTextSecurity: 'disc',
                            textSecurity: 'disc',
                          } as React.CSSProperties)
                    }
                    value={passcode}
                    onChange={(e) => {
                      setPasscode(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Nhập mật khẩu chương..."
                    className="w-full rounded-lg border border-border/80 bg-background px-3.5 py-2.5 pr-10 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:border-[#ff7a1a] focus:ring-1 focus:ring-[#ff7a1a] outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errorMessage && (
                  <p className="text-xs text-red-500 font-medium">{errorMessage}</p>
                )}
                <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                  Học viên chỉ nhập một lần. Đổi mật khẩu sẽ yêu cầu nhập lại.
                </p>
              </div>
            )}

            {/* Cảnh báo Only Me (Nếu khóa học là Only Me) */}
            {isCourseOnlyMe && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-1">
                <div className="flex items-start gap-2 text-amber-500">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium leading-relaxed">
                    Khóa học là Only Me: cấu hình này không có tác dụng.
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground pl-6 leading-relaxed">
                  (Lưu ý: Chương không có chế độ Only Me riêng biệt).
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-border/80 bg-muted/20 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
              className="text-xs h-9 px-4 border-border/80 hover:bg-muted"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={isPending}
              className="bg-[#ff7a1a] hover:bg-[#ff7a1a]/90 text-[#3b1700] text-xs h-9 px-5 font-bold rounded-lg shadow-sm"
            >
              {isPending ? 'Đang lưu...' : 'Áp dụng'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
