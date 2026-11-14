import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Home,
  PlusCircle,
  HelpCircle,
  FolderOpen,
  LogOut,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import logoLight from '@/assets/brand/logo-light.png';
import logoDark from '@/assets/brand/logo-dark.png';
import brainMemoIcon from '@/assets/brand/brain-memo-icon.png';
import { useAuth, useTheme } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';

export function CourseManagementLayout() {
  const { user, profile } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const displayName = profile?.displayName?.trim() || user?.email || 'Người dùng';
  const roleName = user?.isAdmin ? 'Quản trị viên' : 'Giảng viên / Quản trị';
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((w: string) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();

  const mainNavItems = [
    { to: '/manage/courses', label: 'Trang chủ', end: true, icon: Home },
    { to: '/courses/new', label: 'Tạo khóa học', icon: PlusCircle },
    { to: '/manage/questions', label: 'Ngân hàng câu hỏi', icon: HelpCircle },
    { to: '/manage/resources', label: 'Quản lý tài nguyên', icon: FolderOpen },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* LMS MANAGEMENT Collapsible Left Sidebar spanning 100% full height */}
      <aside
        className={cn(
          'flex h-full flex-col justify-between border-r border-border bg-card shrink-0 transition-all duration-300 z-30 select-none',
          isCollapsed ? 'w-[72px] p-3' : 'w-64 p-4'
        )}
      >
        {/* Top Header & Navigation */}
        <div className="space-y-6">
          {/* Brand Logo & Collapse / Expand Toggle */}
          {isCollapsed ? (
            /* Khi thu gọn sidebar: Nút mở rộng chỉ hiển thị khi hover vào logo */
            <div className="relative group flex items-center justify-center h-10 w-10 mx-auto">
              {/* Logo icon mặc định */}
              <img
                src={brainMemoIcon}
                alt="BrainMemo"
                className="h-8 w-8 object-contain select-none transition-opacity duration-200 group-hover:opacity-0 cursor-default"
              />
              {/* Nút mở rộng sidebar khi hover vào logo */}
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                aria-label="Mở rộng sidebar"
                className="absolute inset-0 flex items-center justify-center rounded-xl bg-muted text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm"
                title="Mở rộng sidebar"
              >
                <PanelLeftOpen className="h-5 w-5 text-primary" />
              </button>
            </div>
          ) : (
            /* Khi mở rộng sidebar: Logo web như ở trang chủ (không phản hồi khi click) + Nút thu gọn */
            <div className="flex items-center justify-between pb-1">
              <div
                className="cursor-default select-none flex items-center"
                aria-label="BrainMemo"
              >
                {/* Logo Light Mode */}
                <img
                  src={logoLight}
                  alt="BrainMemo"
                  className="h-8 sm:h-9 w-auto object-contain select-none block dark:hidden"
                />
                {/* Logo Dark Mode */}
                <img
                  src={logoDark}
                  alt="BrainMemo"
                  className="h-8 sm:h-9 w-auto object-contain select-none hidden dark:block"
                />
              </div>

              {/* Nút thu gọn sidebar */}
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                aria-label="Thu gọn sidebar"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Thu gọn sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Navigation Section (Không có chữ Điều hướng chính) */}
          <nav className="space-y-1" aria-label="Điều hướng sidebar">
            {/* 4 Mục điều hướng bên trên */}
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={item.label}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all',
                      isCollapsed ? 'justify-center px-0' : 'px-3.5',
                      isActive
                        ? 'bg-primary/15 font-semibold text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}

            {/* Đường ngăn cách trên nút Thoát */}
            <div className="my-2 border-t border-border" />

            {/* Nút Thoát ngay dưới đường ngăn cách */}
            <NavLink
              to="/"
              title="Thoát"
              className={cn(
                'flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all',
                isCollapsed ? 'justify-center px-0' : 'px-3.5'
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">Thoát</span>}
            </NavLink>
          </nav>
        </div>

        {/* Bottom Sidebar: Appearance & User Profile */}
        <div className="border-t border-border pt-4 space-y-3">
          {/* Toggle Appearance */}
          {isCollapsed ? (
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Chuyển sang giao diện ${resolvedTheme === 'dark' ? 'sáng' : 'tối'}`}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mx-auto"
              title="Chuyển giao diện Sáng/Tối"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Chuyển sang giao diện ${resolvedTheme === 'dark' ? 'sáng' : 'tối'}`}
              className="w-full flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Moon className="h-4 w-4 text-muted-foreground" />
                <span>Giao diện</span>
              </div>
              <Sun className="h-4 w-4 text-muted-foreground hover:text-amber-400 transition-colors" />
            </button>
          )}

          {/* User Profile Card (Không viền bao quanh, không màu nền sẫm hơn) */}
          {isCollapsed ? (
            <div
              className="relative flex justify-center py-1 cursor-default"
              title={`${displayName} (${roleName})`}
            >
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ffb68e] text-slate-900 font-bold text-xs shadow-sm">
                  {initials || 'QT'}
                </div>
              )}
              <span className="absolute bottom-1 right-2 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
            </div>
          ) : (
            <div className="flex items-center gap-3 px-2 py-1 cursor-default">
              <div className="relative">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ffb68e] text-slate-900 font-bold text-xs shadow-sm">
                    {initials || 'QT'}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">{displayName}</p>
                <p className="truncate text-[10px] text-muted-foreground">{roleName}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area: Scrollable full height without any header */}
      <main className="flex-1 h-full overflow-y-auto p-6 sm:p-8 lg:p-10">
        <Outlet />
      </main>
    </div>
  );
}
