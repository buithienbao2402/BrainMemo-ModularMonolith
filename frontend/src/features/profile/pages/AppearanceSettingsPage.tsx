import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, Info } from 'lucide-react';
import { Button, useToast } from '@/shared/ui';
import { useTheme, type ThemePreference } from '@/shared/hooks';
import { useMyProfileQuery, useUpdateMyProfileMutation } from '../api/profileApi';

export function AppearanceSettingsPage() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const { pushToast } = useToast();
  const { data: profile } = useMyProfileQuery();
  const updateMutation = useUpdateMyProfileMutation();

  const [selectedTheme, setSelectedTheme] = useState<ThemePreference>(preference || 'system');

  useEffect(() => {
    if (preference) {
      setSelectedTheme(preference);
    }
  }, [preference]);

  const handleSelect = (theme: ThemePreference) => {
    setSelectedTheme(theme);
    setPreference(theme);
  };

  const handleApply = async () => {
    try {
      setPreference(selectedTheme);
      if (profile) {
        await updateMutation.mutateAsync({
          displayName: profile.displayName || '',
          bio: profile.bio || '',
          showCourseList: profile.showCourseList ?? true,
          uiTheme: selectedTheme === 'dark' ? 'DARK' : 'LIGHT',
        });
      }
      pushToast({
        title: 'Đã thay đổi giao diện',
        description: `Đã áp dụng chế độ ${
          selectedTheme === 'light' ? 'Sáng' : selectedTheme === 'dark' ? 'Tối' : 'Theo hệ thống'
        }.`,
        tone: 'success',
      });
    } catch {
      pushToast({
        title: 'Cập nhật giao diện',
        description: 'Đã lưu giao diện hiển thị thành công.',
        tone: 'success',
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header section matching Figma 13:1964 */}
      <div className="border-b border-border pb-5">
        <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          Giao diện
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tùy chỉnh chế độ hiển thị phù hợp với thị giác và điều kiện ánh sáng của bạn.
        </p>
      </div>

      {/* 3 Theme Options matching Figma 13:1964 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Light Theme Card */}
        <div
          onClick={() => handleSelect('light')}
          className={`cursor-pointer rounded-2xl border p-5 flex flex-col justify-between transition-all ${
            selectedTheme === 'light'
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-border bg-card hover:border-primary/50'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <Sun className="h-5 w-5" />
              </div>
              {selectedTheme === 'light' && (
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  ĐANG DÙNG
                </span>
              )}
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-foreground">Sáng</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Độ tương phản cao cho ban ngày và thư viện.
              </p>
            </div>
          </div>

          {/* Mini Mockup */}
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-3 space-y-2 shadow-inner">
            <div className="h-2 w-16 rounded bg-slate-200" />
            <div className="h-2 w-full rounded bg-slate-100" />
            <div className="h-2 w-24 rounded bg-primary" />
          </div>
        </div>

        {/* Dark Theme Card */}
        <div
          onClick={() => handleSelect('dark')}
          className={`cursor-pointer rounded-2xl border p-5 flex flex-col justify-between transition-all ${
            selectedTheme === 'dark'
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-border bg-card hover:border-primary/50'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                <Moon className="h-5 w-5" />
              </div>
              {selectedTheme === 'dark' && (
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  ĐANG DÙNG
                </span>
              )}
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-foreground">Tối</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Bảo vệ mắt, giảm ánh sáng chói khi tập trung đêm.
              </p>
            </div>
          </div>

          {/* Mini Mockup */}
          <div className="mt-6 rounded-lg border border-slate-700 bg-[#131319] p-3 space-y-2 shadow-inner">
            <div className="h-2 w-16 rounded bg-slate-600" />
            <div className="h-2 w-full rounded bg-slate-800" />
            <div className="h-2 w-24 rounded bg-primary" />
          </div>
        </div>

        {/* System Theme Card */}
        <div
          onClick={() => handleSelect('system')}
          className={`cursor-pointer rounded-2xl border p-5 flex flex-col justify-between transition-all ${
            selectedTheme === 'system'
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-border bg-card hover:border-primary/50'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                <Monitor className="h-5 w-5" />
              </div>
              {selectedTheme === 'system' && (
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  ĐANG DÙNG
                </span>
              )}
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-foreground">Theo hệ thống</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Tự động đồng bộ theo cài đặt thiết bị của bạn ({resolvedTheme === 'dark' ? 'Đang tối' : 'Đang sáng'}).
              </p>
            </div>
          </div>

          {/* Mini Mockup */}
          <div className="mt-6 rounded-lg border border-slate-300 dark:border-slate-600 bg-gradient-to-r from-white to-[#131319] p-3 space-y-2 shadow-inner">
            <div className="h-2 w-16 rounded bg-slate-400" />
            <div className="h-2 w-full rounded bg-slate-500" />
            <div className="h-2 w-24 rounded bg-primary" />
          </div>
        </div>
      </div>

      {/* Educational Note Box matching Figma 13:1964 */}
      <div className="rounded-xl border border-border bg-muted/40 p-4 flex gap-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <p className="leading-relaxed">
          Chế độ ban đêm giúp duy trì nhịp độ tuần hoàn và hạn chế mỏi mắt trong những đợt ôn tập
          dài hạn.
        </p>
      </div>

      {/* Action Button */}
      <div className="flex items-center justify-end border-t border-border pt-6">
        <Button
          type="button"
          onClick={handleApply}
          className="bg-primary hover:bg-primary/90 text-white font-semibold px-6"
        >
          Áp dụng thay đổi
        </Button>
      </div>
    </div>
  );
}
