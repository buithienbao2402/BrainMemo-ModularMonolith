import { Bookmark } from 'lucide-react';
import { Button, useToast } from '@/shared/ui';
import { useSetBookmarkMutation, useRemoveBookmarkMutation } from '../api/learningApi';

interface BookmarkButtonProps {
  courseId: string;
  chapterId: string;
  isBookmarked: boolean;
  onBookmarkChanged?: (bookmarked: boolean) => void;
}

export function BookmarkButton({
  courseId,
  chapterId,
  isBookmarked,
  onBookmarkChanged,
}: BookmarkButtonProps) {
  const { pushToast } = useToast();
  const { mutateAsync: setBookmark, isPending: isSetting } = useSetBookmarkMutation(courseId);
  const { mutateAsync: removeBookmark, isPending: isRemoving } = useRemoveBookmarkMutation(courseId);

  const handleToggle = async () => {
    try {
      if (isBookmarked) {
        await removeBookmark();
        pushToast({
          title: 'Đã bỏ lưu bài học',
          tone: 'default',
        });
        onBookmarkChanged?.(false);
      } else {
        await setBookmark(chapterId);
        pushToast({
          title: 'Đã đánh dấu lưu bài học',
          description: 'Bạn có thể xem lại bài học này trong mục "Khóa học đã lưu".',
          tone: 'success',
        });
        onBookmarkChanged?.(true);
      }
    } catch {
      pushToast({
        title: 'Thao tác thất bại',
        description: 'Không thể cập nhật bookmark lúc này.',
        tone: 'error',
      });
    }
  };

  const isPending = isSetting || isRemoving;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
      className={`h-8 px-2.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors ${
        isBookmarked
          ? 'bg-amber-500/15 border-amber-500/50 text-amber-600 dark:text-amber-400 font-semibold'
          : 'text-muted-foreground hover:text-foreground border-border/80'
      }`}
      title={isBookmarked ? 'Đã đánh dấu bài học' : 'Đánh dấu bài học để đọc lại'}
      aria-label={isBookmarked ? 'Đã đánh dấu' : 'Đánh dấu'}
    >
      <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-current text-amber-500 dark:text-amber-400' : ''}`} />
      <span>{isBookmarked ? 'Đã đánh dấu' : 'Đánh dấu'}</span>
    </Button>
  );
}
