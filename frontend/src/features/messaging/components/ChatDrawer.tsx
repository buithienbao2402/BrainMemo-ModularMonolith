import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { useAuth } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';
import { Button, Skeleton, useToast } from '@/shared/ui';
import {
  useMarkConversationReadMutation,
  useMessagesQuery,
  useOpenConversationMutation,
  useSendMessageMutation,
  type ConversationDto,
} from '../api/messagingApi';

interface ChatDrawerProps {
  courseId: string;
  courseName?: string;
  open: boolean;
  onClose: () => void;
}

export function ChatDrawer({ courseId, courseName, open, onClose }: ChatDrawerProps) {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const [conversation, setConversation] = useState<ConversationDto | null>(null);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const openMutation = useOpenConversationMutation(courseId);
  const convId = conversation?.id ?? '';

  const { data: messagesData, isLoading: isMessagesLoading } = useMessagesQuery(convId);
  const sendMutation = useSendMessageMutation(convId);
  const markReadMutation = useMarkConversationReadMutation(convId);

  useEffect(() => {
    if (!open || !courseId || conversation) return;
    openMutation
      .mutateAsync()
      .then((conv) => setConversation(conv))
      .catch((err: any) => {
        pushToast({
          title: err?.title ?? 'Không thể mở cuộc trò chuyện với giảng viên.',
          tone: 'error',
        });
        onClose();
      });
  }, [open, courseId]);

  useEffect(() => {
    if (open && convId) {
      markReadMutation.mutate();
    }
  }, [open, convId, messagesData?.items?.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.items?.length]);

  if (!open) return null;

  const messages = messagesData?.items ?? [];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !convId) return;

    try {
      await sendMutation.mutateAsync(trimmed);
      setText('');
    } catch (err: any) {
      pushToast({ title: err?.title ?? 'Gửi tin nhắn thất bại.', tone: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" data-testid="chat-drawer">
      <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold">
                {conversation?.instructor?.displayName || 'Giảng viên'}
              </h3>
              <p className="truncate text-xs text-muted-foreground">
                {courseName || conversation?.courseName || 'Nhắn tin trực tiếp'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Đóng chat">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {openMutation.isPending || isMessagesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-3/4 rounded-xl" />
              <Skeleton className="h-12 w-2/3 ml-auto rounded-xl" />
              <Skeleton className="h-12 w-3/4 rounded-xl" />
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Hãy gửi tin nhắn đầu tiên để trao đổi trực tiếp với giảng viên.
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderUserId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm',
                    isMine
                      ? 'ml-auto bg-primary text-primary-foreground rounded-br-sm'
                      : 'mr-auto bg-muted text-foreground rounded-bl-sm'
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <span
                    className={cn(
                      'mt-1 text-[10px] self-end',
                      isMine ? 'text-primary-foreground/75' : 'text-muted-foreground'
                    )}
                  >
                    {msg.createdAt
                      ? new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nhập tin nhắn gửi giảng viên..."
            maxLength={5000}
            className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" size="icon" disabled={sendMutation.isPending || !text.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
