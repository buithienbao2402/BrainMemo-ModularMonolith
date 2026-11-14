import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useToast } from '@/shared/ui';
import { useMyProfileQuery, useUpdateMyProfileMutation } from '../api/profileApi';

export function PrivacySettingsPage() {
  const { pushToast } = useToast();
  const { data: profile } = useMyProfileQuery();
  const updateMutation = useUpdateMyProfileMutation();

  const [showCourseList, setShowCourseList] = useState(profile?.showCourseList ?? true);
  const [lastSync, setLastSync] = useState('Vừa xong');

  const handleToggle = async (val: boolean) => {
    setShowCourseList(val);
    try {
      await updateMutation.mutateAsync({
        displayName: profile?.displayName || '',
        bio: profile?.bio || '',
        showCourseList: val,
        uiTheme: profile?.uiTheme || 'DARK',
      });
      setLastSync('Vừa xong');
      pushToast({
        title: 'Đã lưu quyền riêng tư',
        description: val
          ? 'Danh sách khóa học sẽ hiển thị trên trang cá nhân của bạn.'
          : 'Danh sách khóa học đã được ẩn khỏi trang cá nhân công khai.',
        tone: 'success',
      });
    } catch {
      setShowCourseList(!val);
      pushToast({
        title: 'Lỗi cập nhật',
        description: 'Không thể thay đổi quyền riêng tư lúc này.',
        tone: 'error',
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header section matching Figma 13:1964 */}
      <div className="border-b border-border pb-5">
        <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          Quyền riêng tư
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Quản lý mức độ hiển thị thông tin học tập của bạn trên nền tảng BrainMemo.
        </p>
      </div>

      {/* Main Privacy Card matching Figma 13:1964 */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Công khai an toàn
              </span>
            </div>
            <h3 className="text-base font-semibold text-foreground pt-1">
              Hiển thị danh sách khóa học trên hồ sơ công khai
            </h3>
            <p className="text-xs text-muted-foreground max-w-xl">
              Khóa học Only Me không bao giờ hiển thị. Học viên khác có thể học hỏi lộ trình bạn đã mở khóa.
            </p>
          </div>

          {/* Toggle Switch */}
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={showCourseList}
              onChange={(e) => handleToggle(e.target.checked)}
              disabled={updateMutation.isPending}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-input border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Sync Status Bar */}
        <div className="flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Đã tự động lưu tất cả thay đổi bảo mật</span>
          <span>•</span>
          <span>Lần đồng bộ cuối: {lastSync}</span>
        </div>
      </div>
    </div>
  );
}
