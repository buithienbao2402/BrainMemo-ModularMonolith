import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  CheckSquare,
  GraduationCap,
} from 'lucide-react';

export type CourseManageTab = 'overview' | 'content' | 'students' | 'grading' | 'outcomes';

interface CourseManageSubNavProps {
  courseId: string;
  activeTab: CourseManageTab;
}

export function CourseManageSubNav({ courseId, activeTab }: CourseManageSubNavProps) {
  const tabs = [
    {
      id: 'overview' as CourseManageTab,
      label: 'Tổng quan',
      icon: LayoutDashboard,
      to: `/courses/${courseId}/manage/overview`,
    },
    {
      id: 'content' as CourseManageTab,
      label: 'Danh sách chương',
      icon: BookOpen,
      to: `/courses/${courseId}/manage/content`,
    },
    {
      id: 'students' as CourseManageTab,
      label: 'Danh sách học viên',
      icon: Users,
      to: `/courses/${courseId}/manage/students`,
    },
    {
      id: 'grading' as CourseManageTab,
      label: 'Chấm điểm',
      icon: CheckSquare,
      to: `/courses/${courseId}/manage/grading`,
      badge: '12',
    },
    {
      id: 'outcomes' as CourseManageTab,
      label: 'Chuẩn đầu ra',
      icon: GraduationCap,
      to: `/courses/${courseId}/manage/outcomes`,
    },
  ];

  return (
    <div className="border-b border-border/70 pb-3 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (isActive) {
            return (
              <div
                key={tab.id}
                className="bg-[#ff7a1a] text-white flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm shadow-xs select-none"
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="bg-[#93000a] text-[#ffdad6] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link
              key={tab.id}
              to={tab.to}
              className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="bg-[#93000a] text-[#ffdad6] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
