import { Heart, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';
import { Button, useToast } from '@/shared/ui';
import {
  useNominateCourseMutation,
  useNominationSummaryQuery,
  useWithdrawNominationMutation,
} from '../api/courseApi';

interface NominationButtonProps {
  courseId: string;
  initialCount?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'pill' | 'icon';
}

export function NominationButton({
  courseId,
  initialCount = 0,
  className,
  size = 'md',
}: NominationButtonProps) {
  const { status } = useAuth();
  const navigate = useNavigate();
  const { pushToast } = useToast();

  const { data: summary, isLoading: isSummaryLoading } =
    useNominationSummaryQuery(courseId);
  const { mutateAsync: nominate, isPending: isNominating } =
    useNominateCourseMutation(courseId);
  const { mutateAsync: withdraw, isPending: isWithdrawing } =
    useWithdrawNominationMutation(courseId);

  const hasNominated = summary?.hasNominated ?? false;
  const count = summary?.nominationCount ?? initialCount;
  const isBusy = isNominating || isWithdrawing;

  const handleToggle = async () => {
    if (status !== 'authenticated') {
      pushToast({
        title: 'Cần đăng nhập',
        description: 'Vui lòng đăng nhập để đề cử khóa học.',
        tone: 'default',
      });
      navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    try {
      if (hasNominated) {
        await withdraw();
        pushToast({
          title: 'Đã thu hồi đề cử',
          description: 'Bạn có thể đề cử lại bất cứ lúc nào.',
          tone: 'default',
        });
      } else {
        await nominate();
        pushToast({
          title: 'Đã đề cử khóa học',
          description: 'Cảm ơn bạn đã giới thiệu khóa học hữu ích này tới cộng đồng!',
          tone: 'success',
        });
      }
    } catch (err: any) {
      const message =
        err?.detail ||
        err?.message ||
        'Chỉ học viên đang học hoặc chủ khóa mới có thể đề cử khóa học này.';
      pushToast({
        title: 'Không thể thực hiện đề cử',
        description: message,
        tone: 'error',
      });
    }
  };

  return (
    <Button
      type="button"
      variant={hasNominated ? 'primary' : 'outline'}
      size={size}
      disabled={isBusy || isSummaryLoading}
      onClick={handleToggle}
      className={cn(
        'group flex items-center gap-2 transition-all',
        hasNominated
          ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500 shadow-xs'
          : 'hover:text-rose-500 hover:border-rose-300',
        className
      )}
      title={hasNominated ? 'Bấm để thu hồi đề cử' : 'Đề cử khóa học này (FR-CRS-15)'}
      aria-label={hasNominated ? 'Thu hồi đề cử' : 'Đề cử khóa học'}
      aria-pressed={hasNominated}
    >
      {isBusy ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : (
        <Heart
          className={cn(
            'h-4 w-4 shrink-0 transition-transform group-hover:scale-110',
            hasNominated ? 'fill-current' : 'text-muted-foreground group-hover:text-rose-500'
          )}
        />
      )}
      <span className="font-semibold text-xs sm:text-sm">
        {hasNominated ? 'Đã đề cử' : 'Đề cử'} ({count})
      </span>
    </Button>
  );
}
