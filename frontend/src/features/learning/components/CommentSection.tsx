import { useState } from 'react';
import {
  CornerDownRight,
  Edit2,
  Flag,
  MessageSquare,
  Pin,
  PinOff,
  Send,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';
import {
  Button,
  EmptyState,
  Skeleton,
  useToast,
} from '@/shared/ui';
import { ReportModal } from '@/features/moderation';
import {
  useCommentsQuery,
  useCommentsSummaryQuery,
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useEditCommentMutation,
  usePinCommentMutation,
  useUnpinCommentMutation,
  type CommentDto,
} from '../api/commentsApi';

interface CommentSectionProps {
  courseId: string;
  chapterId?: string;
  isOwner?: boolean;
}

function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return new Date(isoString).toLocaleDateString('vi-VN');
  } catch {
    return '';
  }
}

export function CommentSection({
  courseId,
  chapterId,
  isOwner = false,
}: CommentSectionProps) {
  const { user } = useAuth();
  const { pushToast } = useToast();

  const [newCommentText, setNewCommentText] = useState('');
  const [filterByChapter, setFilterByChapter] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);

  const { data: summary } = useCommentsSummaryQuery(courseId);
  const { data, isLoading } = useCommentsQuery(courseId, {
    chapterId: filterByChapter ? chapterId : undefined,
  });

  const { mutateAsync: createComment, isPending: isSubmitting } =
    useCreateCommentMutation(courseId);
  const { mutateAsync: editComment, isPending: isEditing } =
    useEditCommentMutation(courseId);
  const { mutateAsync: deleteComment } = useDeleteCommentMutation(courseId);
  const { mutateAsync: pinComment } = usePinCommentMutation(courseId);
  const { mutateAsync: unpinComment } = useUnpinCommentMutation(courseId);

  const comments = data?.items || [];
  const currentUserId = user?.id;

  const handleCreateRootComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCommentText.trim();
    if (!trimmed) return;

    try {
      await createComment({
        content: trimmed,
        chapterId: filterByChapter ? chapterId : undefined,
      });
      setNewCommentText('');
      pushToast({
        title: 'Bình luận thành công',
        tone: 'success',
      });
    } catch {
      pushToast({
        title: 'Không thể đăng bình luận',
        tone: 'error',
      });
    }
  };

  const handleCreateReply = async (parentCommentId: string) => {
    const trimmed = replyText.trim();
    if (!trimmed) return;

    try {
      await createComment({
        content: trimmed,
        chapterId: filterByChapter ? chapterId : undefined,
        parentCommentId,
      });
      setReplyText('');
      setReplyingToId(null);
      pushToast({
        title: 'Phản hồi thành công',
        tone: 'success',
      });
    } catch {
      pushToast({
        title: 'Không thể gửi phản hồi',
        tone: 'error',
      });
    }
  };

  const handleSaveEdit = async (commentId: string) => {
    const trimmed = editText.trim();
    if (!trimmed) return;

    try {
      await editComment({ id: commentId, content: trimmed });
      setEditingCommentId(null);
      setEditText('');
      pushToast({
        title: 'Đã cập nhật bình luận',
        tone: 'success',
      });
    } catch {
      pushToast({
        title: 'Không thể sửa bình luận',
        tone: 'error',
      });
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      pushToast({
        title: 'Đã xóa bình luận',
        tone: 'default',
      });
    } catch {
      pushToast({
        title: 'Không thể xóa bình luận',
        tone: 'error',
      });
    }
  };

  const handleTogglePin = async (comment: CommentDto) => {
    try {
      if (comment.isPinned) {
        await unpinComment(comment.id);
        pushToast({
          title: 'Đã bỏ ghim bình luận',
          tone: 'default',
        });
      } else {
        await pinComment(comment.id);
        pushToast({
          title: 'Đã ghim bình luận lên đầu',
          tone: 'success',
        });
      }
    } catch {
      pushToast({
        title: 'Thao tác ghim thất bại',
        tone: 'error',
      });
    }
  };

  return (
    <section
      aria-label="Khu vực thảo luận và bình luận"
      className="rounded-2xl border border-border bg-card p-5 sm:p-7 space-y-6 shadow-xs"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span>Hỏi đáp & Thảo luận</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {summary?.totalComments ?? comments.length}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Trao đổi thắc mắc bài học trực tiếp với Giảng viên và cộng đồng.
            </p>
          </div>
        </div>

        {chapterId ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground self-start sm:self-auto">
            <input
              type="checkbox"
              id="filter-chapter"
              checked={filterByChapter}
              onChange={(e) => setFilterByChapter(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="filter-chapter" className="cursor-pointer select-none">
              Chỉ hiện bình luận chương này
            </label>
          </div>
        ) : null}
      </div>

      {/* Composer: New Root Comment */}
      <form onSubmit={handleCreateRootComment} className="space-y-3">
        <div className="relative">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Đặt câu hỏi hoặc chia sẻ ý kiến của bạn về bài học..."
            maxLength={2000}
            rows={3}
            className="w-full rounded-xl border border-input bg-background p-3.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
          />
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-muted-foreground">
              {newCommentText.length}/2000 ký tự
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !newCommentText.trim()}
              className="flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Gửi bình luận</span>
            </Button>
          </div>
        </div>
      </form>

      {/* Comment List */}
      <div className="space-y-4 pt-2">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : comments.length === 0 ? (
          <EmptyState
            title="Chưa có bình luận nào"
            description="Hãy là người đầu tiên đặt câu hỏi hoặc chia sẻ cảm nhận về bài học này!"
            icon={<MessageSquare className="h-8 w-8 text-muted-foreground" />}
          />
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              data-testid="comment-thread"
              className={cn(
                'rounded-xl border p-4 transition-colors space-y-3',
                comment.isPinned
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border/70 bg-card'
              )}
            >
              {/* Pinned Badge */}
              {comment.isPinned ? (
                <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                  <Pin className="h-3.5 w-3.5 fill-current" />
                  <span>Đã ghim bởi Giảng viên</span>
                </div>
              ) : null}

              {/* Author & Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                    {comment.author.avatarUrl ? (
                      <img
                        src={comment.author.avatarUrl}
                        alt={comment.author.displayName}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      comment.author.displayName?.[0]?.toUpperCase() || <UserIcon className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {comment.author.displayName}
                      </span>
                      {comment.author.id === currentUserId ? (
                        <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          Bạn
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {formatRelativeTime(comment.createdAt)}
                      {comment.editedAt ? ' (đã chỉnh sửa)' : ''}
                    </span>
                  </div>
                </div>

                {/* Pin / Edit / Delete / Report actions */}
                <div className="flex items-center gap-1">
                  {isOwner ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => handleTogglePin(comment)}
                      title={comment.isPinned ? 'Bỏ ghim' : 'Ghim bình luận'}
                    >
                      {comment.isPinned ? (
                        <PinOff className="h-3.5 w-3.5" />
                      ) : (
                        <Pin className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  ) : null}

                  {comment.author.id === currentUserId && !comment.isDeleted ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingCommentId(comment.id);
                          setEditText(comment.content);
                        }}
                        title="Chỉnh sửa bình luận"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(comment.id)}
                        title="Xóa bình luận"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : null}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-amber-500"
                    onClick={() => setReportCommentId(comment.id)}
                    title="Báo cáo vi phạm"
                  >
                    <Flag className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Body */}
              {editingCommentId === comment.id ? (
                <div className="space-y-2 pt-1">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(comment.id)}
                      disabled={isEditing || !editText.trim()}
                    >
                      Lưu
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingCommentId(null)}
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              ) : comment.isDeleted ? (
                <p className="text-sm italic text-muted-foreground">
                  Bình luận này đã bị xóa.
                </p>
              ) : (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              )}

              {/* Reply CTA */}
              {!comment.isDeleted ? (
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (replyingToId === comment.id) {
                        setReplyingToId(null);
                      } else {
                        setReplyingToId(comment.id);
                        setReplyText('');
                      }
                    }}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <CornerDownRight className="h-3.5 w-3.5" />
                    <span>Trả lời</span>
                  </Button>
                </div>
              ) : null}

              {/* Inline Reply Composer */}
              {replyingToId === comment.id ? (
                <div className="ml-4 sm:ml-8 border-l-2 border-primary/30 pl-3 pt-2 space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Trả lời @${comment.author.displayName}...`}
                    rows={2}
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleCreateReply(comment.id)}
                      disabled={isSubmitting || !replyText.trim()}
                      className="h-7 text-xs"
                    >
                      Gửi trả lời
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReplyingToId(null)}
                      className="h-7 text-xs"
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Nested Replies (Max 1 Level Depth) */}
              {comment.replies && comment.replies.length > 0 ? (
                <div className="ml-4 sm:ml-8 border-l-2 border-border/80 pl-3 pt-2 space-y-3">
                  {comment.replies.map((reply) => (
                    <div
                      key={reply.id}
                      data-testid="comment-reply"
                      className="rounded-lg bg-muted/40 p-3 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {reply.author.displayName}
                          </span>
                          {reply.author.id === currentUserId ? (
                            <span className="text-[10px] font-medium bg-muted px-1.5 py-0.2 rounded text-muted-foreground">
                              Bạn
                            </span>
                          ) : null}
                          <span className="text-[10px] text-muted-foreground">
                            {formatRelativeTime(reply.createdAt)}
                            {reply.editedAt ? ' (đã sửa)' : ''}
                          </span>
                        </div>

                        {reply.author.id === currentUserId && !reply.isDeleted ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(reply.id)}
                              title="Xóa phản hồi"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : null}
                      </div>

                      {reply.isDeleted ? (
                        <p className="italic text-muted-foreground">
                          Phản hồi này đã bị xóa.
                        </p>
                      ) : (
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                          {reply.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {reportCommentId ? (
        <ReportModal
          isOpen={Boolean(reportCommentId)}
          onClose={() => setReportCommentId(null)}
          targetType="COMMENT"
          targetId={reportCommentId}
          targetTitle="Bình luận bài học"
        />
      ) : null}
    </section>
  );
}
