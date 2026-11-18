import { useState, useEffect } from 'react';
import { MessageSquare, CheckCheck, ArrowRight, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui';
import {
  useConversationsQuery,
  useUnreadMessagesCountQuery,
  type ConversationDto,
} from '../api/messagingApi';
import {
  getStoredConversations,
  markAllStoredConversationsAsRead,
  markStoredConversationAsRead,
  type StoredConversation,
} from './messagingMockData';

interface MessagesDropdownProps {
  className?: string;
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '';
  const now = Date.now();
  const past = new Date(dateString).getTime();
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} giờ`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} ngày`;
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

export function MessagesDropdown({ className }: MessagesDropdownProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Load from API with fallback to stored local mock conversations (only when user is authenticated)
  const isAuth = Boolean(user);
  const { data: apiData } = useConversationsQuery({ enabled: isAuth });
  const { data: unreadApiData } = useUnreadMessagesCountQuery(isAuth);

  const [storedConvs, setStoredConvs] = useState<StoredConversation[]>([]);

  useEffect(() => {
    setStoredConvs(getStoredConversations());
  }, [open]);

  // Merge API data or fallback
  const conversations: (ConversationDto | StoredConversation)[] =
    (apiData?.items && apiData.items.length > 0) ? apiData.items : storedConvs;

  const totalUnread =
    unreadApiData?.unreadCount ??
    conversations.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0);

  const displayBadge = totalUnread > 99 ? '99+' : String(totalUnread);

  const handleSelectConversation = (convId: string) => {
    markStoredConversationAsRead(convId);
    setOpen(false);
    navigate(`/me/messages?c=${convId}`);
  };

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllStoredConversationsAsRead();
    setStoredConvs(getStoredConversations());
  };

  const handleOpenFullPage = () => {
    setOpen(false);
    navigate('/me/messages');
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative h-9 w-9 text-muted-foreground hover:text-foreground', className)}
          aria-label={totalUnread > 0 ? `Tin nhắn (${totalUnread} chưa đọc)` : 'Tin nhắn'}
          title={totalUnread > 0 ? `Tin nhắn (${totalUnread} chưa đọc)` : 'Tin nhắn'}
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          {totalUnread > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background"
            >
              {displayBadge}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[380px] max-w-[94vw] p-2 space-y-1.5 rounded-2xl border border-[#e5e7eb] bg-white shadow-xl dark:border-[#262630] dark:bg-[#121217]"
      >
        {/* Dropdown Header */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-[#111827] dark:text-[#f3f4f6]">Tin nhắn</h3>
            {totalUnread > 0 && (
              <span className="rounded-full bg-brand-orange/15 px-2 py-0.5 text-[11px] font-semibold text-brand-orange">
                {totalUnread} mới
              </span>
            )}
          </div>
          {totalUnread > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs font-medium text-brand-orange hover:underline focus:outline-none"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Đã đọc hết</span>
            </button>
          )}
        </div>

        <DropdownMenuSeparator className="bg-[#e5e7eb] dark:bg-[#262630]" />

        {/* Conversations List */}
        <div className="max-h-[360px] overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
          {conversations.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Chưa có cuộc trò chuyện nào
            </div>
          ) : (
            conversations.slice(0, 5).map((conv) => {
              const peer = conv.instructor ?? conv.student;
              const hasUnread = (conv.unreadCount ?? 0) > 0;
              const peerName = peer?.displayName || 'Người dùng';
              const firstLetter = peerName.charAt(0).toUpperCase();

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => handleSelectConversation(conv.id ?? '')}
                  className={cn(
                    'group flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors',
                    hasUnread
                      ? 'bg-brand-orange/5 hover:bg-brand-orange/10 dark:bg-brand-orange/10 dark:hover:bg-brand-orange/15'
                      : 'hover:bg-muted/70 dark:hover:bg-[#1c1c24]'
                  )}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {peer?.avatarUrl ? (
                      <img
                        src={peer.avatarUrl}
                        alt={peerName}
                        className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange/15 font-bold text-sm text-brand-orange">
                        {firstLetter}
                      </div>
                    )}
                    {hasUnread && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-brand-orange" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={cn(
                          'truncate text-xs font-semibold',
                          hasUnread
                            ? 'text-foreground font-bold'
                            : 'text-foreground/90 group-hover:text-foreground'
                        )}
                      >
                        {peerName}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatRelativeTime(conv.lastMessageAt)}
                      </span>
                    </div>

                    {/* Course Name */}
                    {conv.courseName && (
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-brand-orange dark:text-brand-orange/90 truncate">
                        <BookOpen className="h-3 w-3 shrink-0" />
                        <span className="truncate">{conv.courseName}</span>
                      </div>
                    )}

                    {/* Preview message */}
                    <p
                      className={cn(
                        'mt-0.5 truncate text-xs',
                        hasUnread
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      {conv.lastMessagePreview || 'Bắt đầu cuộc trò chuyện'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator className="bg-[#e5e7eb] dark:bg-[#262630]" />

        {/* Footer: View All Full Page */}
        <div className="p-1">
          <Button
            type="button"
            variant="ghost"
            onClick={handleOpenFullPage}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-brand-orange hover:bg-brand-orange/10 hover:text-brand-orange"
          >
            <span>Mở toàn bộ trang tin nhắn</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
