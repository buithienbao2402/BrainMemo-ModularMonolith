import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';
import { Button, EmptyState, Skeleton, useToast } from '@/shared/ui';
import {
  useConversationsQuery,
  useMarkConversationReadMutation,
  useMessagesQuery,
  useSendMessageMutation,
} from '../api/messagingApi';

export function MessagesPage() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const [selectedConvId, setSelectedConvId] = useState<string>('');
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: convData, isLoading: isConvsLoading } = useConversationsQuery();
  const conversations = convData?.items ?? [];

  useEffect(() => {
    if (!selectedConvId && conversations.length > 0 && conversations[0]?.id) {
      setSelectedConvId(conversations[0].id);
    }
  }, [conversations, selectedConvId]);

  const activeConv = conversations.find((c) => c.id === selectedConvId);
  const { data: messagesData, isLoading: isMsgsLoading } = useMessagesQuery(selectedConvId);
  const sendMutation = useSendMessageMutation(selectedConvId);
  const markReadMutation = useMarkConversationReadMutation(selectedConvId);

  useEffect(() => {
    if (selectedConvId) {
      markReadMutation.mutate();
    }
  }, [selectedConvId, messagesData?.items?.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.items?.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !selectedConvId) return;

    try {
      await sendMutation.mutateAsync(trimmed);
      setText('');
    } catch (err: any) {
      pushToast({ title: err?.title ?? 'Không thể gửi tin nhắn.', tone: 'error' });
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6" data-testid="messages-page">
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-bold tracking-tight">
        <MessageSquare className="h-6 w-6 text-primary" />
        Tin nhắn trực tiếp
      </h1>

      <div className="grid h-[70vh] min-h-[480px] grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:grid-cols-3">
        {/* Left: Conversations List */}
        <div className="border-r border-border overflow-y-auto">
          <div className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Hội thoại ({conversations.length})
          </div>
          {isConvsLoading ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Chưa có cuộc trò chuyện nào.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {conversations.map((conv) => {
                const isStudent = conv.student?.id === user?.id;
                const peer = isStudent ? conv.instructor : conv.student;
                const isSelected = conv.id === selectedConvId;

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedConvId(conv.id ?? '')}
                    className={cn(
                      'flex w-full items-start gap-3 p-3.5 text-left transition-colors hover:bg-muted/50',
                      isSelected && 'bg-primary/5 border-l-2 border-l-primary'
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {peer?.displayName?.[0]?.toUpperCase() || <UserIcon className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">
                          {peer?.displayName || 'Người dùng'}
                        </span>
                        {(conv.unreadCount ?? 0) > 0 && (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] font-medium text-primary/80">
                        {conv.courseName}
                      </p>
                      {conv.lastMessagePreview && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {conv.lastMessagePreview}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Active Chat */}
        <div className="flex flex-col md:col-span-2">
          {!activeConv ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                title="Chọn một cuộc trò chuyện"
                description="Chọn cuộc trò chuyện từ danh sách bên trái để xem lịch sử và phản hồi."
                icon={<MessageSquare className="h-10 w-10 text-muted-foreground" />}
              />
            </div>
          ) : (
            <>
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-bold">
                  {activeConv.student?.id === user?.id
                    ? activeConv.instructor?.displayName
                    : activeConv.student?.displayName}
                </p>
                <p className="text-xs text-muted-foreground">Khóa học: {activeConv.courseName}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isMsgsLoading ? (
                  <Skeleton className="h-24 w-full rounded-xl" />
                ) : (
                  (messagesData?.items ?? []).map((msg) => {
                    const isMine = msg.senderUserId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex flex-col max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm',
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

              <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Nhập tin nhắn phản hồi..."
                  maxLength={5000}
                  className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button type="submit" disabled={sendMutation.isPending || !text.trim()}>
                  <Send className="mr-1.5 h-4 w-4" /> Gửi
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
