import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/shared/hooks';
import { Button } from '@/shared/ui';

export function ThemeToggleButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? t('theme.toLight') : t('theme.toDark')}
      title={t('theme.toggle')}
      className={className}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-300" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700" aria-hidden="true" />
      )}
    </Button>
  );
}
