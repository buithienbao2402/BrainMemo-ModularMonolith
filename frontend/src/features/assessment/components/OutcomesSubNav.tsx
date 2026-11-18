import { Link } from 'react-router-dom';
import { GraduationCap, LayoutGrid, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export type OutcomeTab = 'clos' | 'matrix' | 'rules';

interface OutcomesSubNavProps {
  courseId: string;
  activeTab: OutcomeTab;
  matrixCount?: number;
}

export function OutcomesSubNav({ courseId, activeTab, matrixCount }: OutcomesSubNavProps) {
  const tabs = [
    {
      id: 'clos' as OutcomeTab,
      label: 'CLO',
      icon: GraduationCap,
      to: `/courses/${courseId}/manage/outcomes`,
    },
    {
      id: 'matrix' as OutcomeTab,
      label: 'Ma trận bài đánh giá',
      icon: LayoutGrid,
      to: `/courses/${courseId}/manage/outcomes/mapping`,
      badge: matrixCount !== undefined ? String(matrixCount) : '6',
    },
    {
      id: 'rules' as OutcomeTab,
      label: 'Quy tắc điểm',
      icon: SlidersHorizontal,
      to: `/courses/${courseId}/manage/outcomes/rules`,
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Chuẩn đầu ra và đánh giá"
      className="flex items-center gap-2 border-b border-border/70 pb-3 overflow-x-auto"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        if (isActive) {
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected="true"
              className="bg-[#ff7a1a] text-white flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm shadow-xs select-none"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="bg-black/25 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
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
            role="tab"
            aria-selected="false"
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm transition-colors select-none',
              'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="bg-muted text-muted-foreground text-[11px] font-semibold px-2 py-0.5 rounded-full">
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
