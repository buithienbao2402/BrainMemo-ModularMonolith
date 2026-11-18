import { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  GraduationCap,
  Users,
  CheckCheck,
  MoreVertical,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
import {
  useConversationsQuery,
  useMarkConversationReadMutation,
  useMessagesQuery,
  useSendMessageMutation,
  type ConversationDto,
  type MessageDto,
} from '../api/messagingApi';
import {
  getStoredConversations,
  getStoredMessages,
  appendStoredMessage,
  markStoredConversationAsRead,
  getOrCreateUserConversation,
  SYSTEM_USERS,
  type StoredConversation,
  type StoredMessage,
  type SystemUser,
} from '../components/messagingMockData';

function formatMessageTime(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNREAD'>('ALL');
  const [inputText, setInputText] = useState('');

  // Mobile view state: when viewing on mobile, show chat or list
  const [mobileChatView, setMobileChatView] = useState(false);

  // New Chat Modal state (Search across whole system users)
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [userSearchText, setUserSearchText] = useState('');

  // Local state for instant reactivity and mock fallback
  const [storedConvs, setStoredConvs] = useState<StoredConversation[]>(getStoredConversations());
  const [localMessagesMap, setLocalMessagesMap] = useState<Record<string, StoredMessage[]>>({});

  // API hooks
  const { data: convData } = useConversationsQuery({
    enabled: Boolean(user),
  });

  // Combine API data with stored mock data
  const conversations: (ConversationDto | StoredConversation)[] = useMemo(() => {
    if (convData?.items && convData.items.length > 0) {
      return convData.items;
    }
    return storedConvs;
  }, [convData, storedConvs]);

  // Selected conversation ID from URL params or first item
  const selectedConvId = searchParams.get('c') || (conversations[0]?.id ?? 'conv-tri');

  // Active conversation object
  const activeConv = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvId) || conversations[0] || null;
  }, [conversations, selectedConvId]);

  const activeId = activeConv?.id ?? 'conv-tri';

  // API query for messages
  const { data: messagesData } = useMessagesQuery(activeId);
  const sendMutation = useSendMessageMutation(activeId);
  const markReadMutation = useMarkConversationReadMutation(activeId);

  // Retrieve messages for active conversation
  const messages: (MessageDto | StoredMessage)[] = useMemo(() => {
    if (messagesData?.items && messagesData.items.length > 0) {
      return messagesData.items;
    }
    if (activeId) {
      return localMessagesMap[activeId] ?? getStoredMessages(activeId);
    }
    return [];
  }, [messagesData, activeId, localMessagesMap]);

  // Sync selected conversation to URL if not set
  useEffect(() => {
    if (!searchParams.get('c') && conversations.length > 0 && conversations[0]?.id) {
      setSearchParams({ c: conversations[0].id }, { replace: true });
    }
  }, [conversations, searchParams, setSearchParams]);

  // Mark as read when active conversation changes
  useEffect(() => {
    if (activeId) {
      markReadMutation.mutate();
      markStoredConversationAsRead(activeId);
      setStoredConvs(getStoredConversations());
    }
  }, [activeId]);

  // Scroll to bottom on message updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeId]);

  // Filter conversations based on search and tab
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const peer = c.instructor ?? c.student;
      const peerName = (peer?.displayName || '').toLowerCase();
      const courseName = (c.courseName || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesQuery = !q || peerName.includes(q) || courseName.includes(q);
      const matchesFilter = filterMode === 'ALL' || (c.unreadCount ?? 0) > 0;

      return matchesQuery && matchesFilter;
    });
  }, [conversations, searchQuery, filterMode]);

  const unreadCountTotal = useMemo(() => {
    return conversations.filter((c) => (c.unreadCount ?? 0) > 0).length;
  }, [conversations]);

  const handleSelectConv = (id: string) => {
    setSearchParams({ c: id });
    setMobileChatView(true);
    markStoredConversationAsRead(id);
    setStoredConvs(getStoredConversations());
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !activeId) return;

    const now = new Date();
    const timeDisplay = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    // Create optimistic / local message
    const newMsg: StoredMessage = {
      id: `msg-${Date.now()}`,
      conversationId: activeId,
      senderUserId: user?.id || 'user-quang',
      senderName: 'Quang Trần (Bạn)',
      content: trimmed,
      createdAt: now.toISOString(),
      timeDisplay,
      readAt: timeDisplay,
    };

    // Update local state immediately
    appendStoredMessage(activeId, newMsg);
    setLocalMessagesMap((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? getStoredMessages(activeId)), newMsg],
    }));
    setStoredConvs(getStoredConversations());
    setInputText('');

    // Send via API (silently catch if mock mode)
    try {
      await sendMutation.mutateAsync(trimmed);
    } catch {
      // API call failure in local mock mode is expected and handled gracefully
    }
  };

  // Filtered system users for New Chat Modal
  const matchedUsers = useMemo(() => {
    const q = userSearchText.toLowerCase().trim();
    if (!q) return SYSTEM_USERS;
    return SYSTEM_USERS.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.courseName && u.courseName.toLowerCase().includes(q))
    );
  }, [userSearchText]);

  const handleStartChatWithUser = (targetUser: SystemUser) => {
    const newConvId = getOrCreateUserConversation({
      userId: targetUser.id,
      displayName: targetUser.displayName,
      avatarUrl: targetUser.avatarUrl,
      email: targetUser.email,
      roleBadge: targetUser.roleBadge,
      courseName: targetUser.courseName,
    });
    setStoredConvs(getStoredConversations());
    setSearchParams({ c: newConvId });
    setIsNewChatOpen(false);
    setUserSearchText('');
    setMobileChatView(true);
  };

  const handleStartChatWithCustomEmail = () => {
    const email = userSearchText.trim();
    if (!email) return;
    const namePart = email.split('@')[0] || email;
    const newConvId = getOrCreateUserConversation({
      userId: `user-custom-${Date.now()}`,
      displayName: namePart,
      email,
      roleBadge: 'Thành viên',
      courseName: 'Trao đổi trực tiếp',
    });
    setStoredConvs(getStoredConversations());
    setSearchParams({ c: newConvId });
    setIsNewChatOpen(false);
    setUserSearchText('');
    setMobileChatView(true);
  };

  const peer = activeConv
    ? (activeConv.student?.id === user?.id ? activeConv.instructor : activeConv.student)
    : null;
  const peerName = peer?.displayName || 'TS. Hoàng Minh Trí';
  const roleLabel = (activeConv as any)?.instructor?.roleLabel;
  const isPeerOnline = (activeConv as any)?.instructor?.isOnline !== false;

  return (
    // FIX 1: chiều cao = viewport - header, không cho trang tự cuộn
    <div className="h-[calc(100dvh-65px)] overflow-hidden bg-background text-foreground transition-colors duration-200">
      <div className="mx-auto h-full max-w-[1280px] px-4 py-4 sm:px-6">
        {/* FIX 2: grid lấp đầy phần còn lại, bỏ h-[760px] max-h-[85vh] */}
        <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card shadow-xl dark:border-[#27272a] dark:bg-[#121215] md:grid-cols-12 transition-colors duration-200">
          {/* Left Column: Conversations List */}
          <div
            className={cn(
              // FIX 3: min-h-0
              'flex min-h-0 flex-col border-r border-border bg-[#fbfbfc] dark:border-[#27272a] dark:bg-[#141416] md:col-span-5 lg:col-span-4 transition-colors duration-200',
              mobileChatView ? 'hidden md:flex' : 'flex'
            )}
          >
            {/* Header: Title & New Chat */}
            <div className="shrink-0 p-4 pb-2">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold tracking-tight text-foreground">Tin nhắn</h1>
              </div>

              {/* Search Bar with Sliders/Filter Icon */}
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm bạn học, giảng viên, tài liệu..."
                  className="h-9 w-full rounded-xl border border-border bg-background pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-[#f97316]/70 focus:outline-none dark:border-neutral-800 dark:bg-[#1c1c20]"
                />
              </div>

              {/* Filter Tabs */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterMode('ALL')}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold transition-all',
                    filterMode === 'ALL'
                      ? 'bg-[#f97316] text-white shadow-xs'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground dark:bg-[#1f1f23] dark:text-neutral-400 dark:hover:text-white'
                  )}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('UNREAD')}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold transition-all',
                    filterMode === 'UNREAD'
                      ? 'bg-[#f97316] text-white shadow-xs'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground dark:bg-[#1f1f23] dark:text-neutral-400 dark:hover:text-white'
                  )}
                >
                  Chưa đọc ({unreadCountTotal})
                </button>
              </div>
            </div>

            {/* Conversation List — FIX 4: min-h-0 */}
            <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Không tìm thấy cuộc trò chuyện nào.
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const convPeer = conv.instructor ?? conv.student;
                  const isSelected = conv.id === activeId;
                  const hasUnread = (conv.unreadCount ?? 0) > 0;
                  const name = convPeer?.displayName || 'Người dùng';
                  const badge = (conv as any)?.instructor?.roleBadge;
                  const isOnline = (conv as any)?.instructor?.isOnline !== false;
                  const isGroupIcon = (conv as any)?.instructor?.isGroupIcon;
                  const isTaIcon = (conv as any)?.instructor?.isTeachingAssistantIcon;
                  const initials = (conv as any)?.instructor?.initials;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConv(conv.id ?? '')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleSelectConv(conv.id ?? '');
                        }
                      }}
                      className={cn(
                        'group relative flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all cursor-pointer',
                        isSelected
                          ? 'border border-[#f97316] bg-orange-50/70 shadow-xs dark:bg-[#1e1b18]'
                          : 'border border-transparent hover:bg-muted/60 dark:hover:bg-[#1a1a1e]'
                      )}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0 mt-0.5">
                        {convPeer?.avatarUrl ? (
                          <img
                            src={convPeer.avatarUrl}
                            alt={name}
                            className="h-10 w-10 rounded-full object-cover ring-1 ring-border dark:ring-neutral-700"
                          />
                        ) : isGroupIcon ? (
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-700/40">
                            <Users className="h-5 w-5" />
                          </div>
                        ) : isTaIcon ? (
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/40">
                            <GraduationCap className="h-5 w-5" />
                          </div>
                        ) : initials ? (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground font-bold text-xs ring-1 ring-border dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700">
                            {initials}
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f97316]/15 font-bold text-xs text-[#f97316] dark:bg-[#f97316]/20">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        {/* Online Indicator Dot */}
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card dark:ring-[#141416]" />
                        )}
                      </div>

                      {/* Conversation Content */}
                      <div className="min-w-0 flex-1">
                        {/* Top Line: Name, Role Badge, Time */}
                        <div className="flex items-center gap-1.5 justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate font-bold text-xs text-foreground dark:text-neutral-100">
                              {name}
                            </span>
                            {badge && (
                              <span
                                className={cn(
                                  'shrink-0 text-[10px] font-semibold px-1 py-0.2 rounded border',
                                  badge === 'GV'
                                    ? 'border-[#f97316]/70 text-[#f97316]'
                                    : badge === '5 tv'
                                    ? 'border-blue-300 text-blue-600 dark:border-blue-500/60 dark:text-blue-400'
                                    : badge === 'Trợ giảng'
                                    ? 'border-emerald-400 text-emerald-700 dark:border-emerald-500/60 dark:text-emerald-400'
                                    : 'border-border text-muted-foreground dark:border-neutral-600 dark:text-neutral-400'
                                )}
                              >
                                {badge}
                              </span>
                            )}
                          </div>
                          <span className="shrink-0 text-[10px] text-muted-foreground dark:text-neutral-400">
                            {conv.lastMessageAt || '10:45'}
                          </span>
                        </div>

                        {/* Subtitle Line: Course */}
                        {conv.courseName && (
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground dark:text-neutral-400 truncate">
                            <BookOpen className="h-3 w-3 shrink-0 text-muted-foreground/70 dark:text-neutral-500" />
                            <span className="truncate">{conv.courseName}</span>
                          </div>
                        )}

                        {/* Bottom Line: Last Message Preview & Unread Pill */}
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground dark:text-neutral-300 truncate">
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full shrink-0',
                                hasUnread
                                  ? 'bg-emerald-500 dark:bg-emerald-400'
                                  : 'bg-neutral-300 dark:bg-neutral-600'
                              )}
                            />
                            <span className="truncate">{conv.lastMessagePreview}</span>
                          </div>
                          {hasUnread && (
                            <span className="flex h-4 min-w-[16px] shrink-0 items-center justify-center rounded-full bg-[#f97316] px-1 text-[10px] font-bold text-white">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active Chat Thread Window */}
          <div
            className={cn(
              // FIX 3: min-h-0
              'flex min-h-0 flex-col bg-card/40 dark:bg-[#0f0f12] md:col-span-7 lg:col-span-8 transition-colors duration-200',
              mobileChatView ? 'flex' : 'hidden md:flex'
            )}
          >
            {/* Chat Header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/90 px-4 sm:px-6 backdrop-blur dark:border-[#27272a] dark:bg-[#121215]/80">
              <div className="flex items-center gap-3">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setMobileChatView(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden dark:hover:bg-neutral-800 dark:hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                {/* Avatar with Online Dot */}
                <div className="relative">
                  {peer?.avatarUrl ? (
                    <img
                      src={peer.avatarUrl}
                      alt={peerName}
                      className="h-10 w-10 rounded-full object-cover ring-1 ring-border dark:ring-neutral-700"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f97316]/15 font-bold text-xs text-[#f97316] dark:bg-[#f97316]/20">
                      {peerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isPeerOnline && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card dark:ring-[#121215]" />
                  )}
                </div>

                {/* Name, Role Badge, Status */}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm sm:text-base text-foreground dark:text-neutral-100">
                      {peerName}
                    </h2>
                    {roleLabel && (
                      <span className="rounded-md border border-[#f97316]/60 px-2 py-0.5 text-[10px] font-medium text-[#f97316]">
                        {roleLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                    <span>Đang trực tuyến</span>
                  </div>
                </div>
              </div>

              {/* Action Dropdown */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition dark:hover:bg-neutral-800 dark:hover:text-white"
                  title="Tùy chọn hội thoại"
                  onClick={() => {
                    if (peer?.id) {
                      navigate(`/users/${peer.id}`);
                    }
                  }}
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Chat Body — FIX 4: min-h-0 */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin bg-muted/20 dark:bg-[#0f0f12]">
              {/* Date Header Pill */}
              <div className="flex justify-center my-2">
                <span className="rounded-full border border-border bg-card px-4 py-1 text-xs text-muted-foreground shadow-2xs dark:border-neutral-800/80 dark:bg-[#1c1c20] dark:text-neutral-400">
                  Hôm nay, 16 Tháng 11, 2026
                </span>
              </div>

              {/* Messages list */}
              {messages.map((rawMsg) => {
                const msg = rawMsg as StoredMessage;
                const isMe =
                  msg.senderUserId === user?.id ||
                  msg.senderUserId === 'user-quang' ||
                  msg.senderUserId === 'current-user' ||
                  msg.senderName?.includes('(Bạn)');

                const timeStr = msg.timeDisplay || formatMessageTime(msg.createdAt);

                if (isMe) {
                  return (
                    <div key={msg.id} className="flex flex-col items-end ml-auto max-w-[85%]">
                      {/* Name & Time Header */}
                      <div className="mb-1 flex items-center gap-2 justify-end text-xs">
                        <span className="text-muted-foreground dark:text-neutral-400">{timeStr}</span>
                        <span className="font-semibold text-[#f97316]">Quang Trần (Bạn)</span>
                      </div>

                      {/* Orange Bubble */}
                      <div className="rounded-2xl rounded-tr-sm bg-[#f97316] p-3.5 sm:p-4 text-xs sm:text-sm text-white shadow-sm leading-relaxed whitespace-pre-wrap font-normal">
                        {msg.content}
                      </div>

                      {/* Seen status */}
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground dark:text-neutral-400 justify-end">
                        <CheckCheck className="h-3.5 w-3.5 text-muted-foreground dark:text-neutral-400" />
                        <span>Đã xem {msg.readAt || timeStr}</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex items-start gap-3 max-w-[85%]">
                    {/* Peer avatar */}
                    {peer?.avatarUrl ? (
                      <img
                        src={peer.avatarUrl}
                        alt={peerName}
                        className="h-8 w-8 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-border dark:ring-neutral-700"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f97316]/15 font-bold text-xs text-[#f97316] shrink-0 mt-0.5 dark:bg-[#f97316]/20">
                        {peerName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      {/* Sender Name & Time */}
                      <div className="mb-1 flex items-center gap-2 text-xs">
                        <span className="font-bold text-foreground dark:text-neutral-200">
                          {msg.senderName || peerName}
                        </span>
                        <span className="text-muted-foreground dark:text-neutral-400">{timeStr}</span>
                      </div>

                      {/* Incoming Bubble */}
                      <div className="rounded-2xl rounded-tl-sm border border-border bg-card p-3.5 sm:p-4 text-xs sm:text-sm text-foreground shadow-2xs leading-relaxed whitespace-pre-wrap dark:border-neutral-800 dark:bg-[#1c1c21] dark:text-neutral-200">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={bottomRef} />
            </div>

            {/* Chat Bottom: Pure Plain-text Input Bar */}
            <div className="shrink-0 border-t border-border bg-card p-3 sm:p-4 dark:border-[#27272a] dark:bg-[#121215]">
              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 transition focus-within:border-[#f97316]/70 shadow-2xs dark:border-neutral-800 dark:bg-[#18181c]"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Nhập nội dung trao đổi học vụ với ${peerName}...`}
                  className="flex-1 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none dark:text-neutral-100 dark:placeholder:text-neutral-500"
                />

                <Button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#f97316] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#ea580c] disabled:opacity-40 transition"
                >
                  <span>Gửi</span>
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog: Search system users & start new conversation */}
      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogContent className="max-w-lg rounded-2xl border border-border bg-card text-foreground p-6 shadow-2xl dark:border-neutral-800 dark:bg-[#141417] dark:text-neutral-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2 dark:text-white">
              <MessageSquare className="h-5 w-5 text-[#f97316]" />
              Bắt đầu cuộc trò chuyện mới
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground dark:text-neutral-400">
              Nhập email hoặc họ tên của giảng viên, trợ giảng hoặc bạn học trên toàn hệ thống để mở
              chat trực tiếp.
            </DialogDescription>
          </DialogHeader>

          {/* Search Input */}
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              autoFocus
              value={userSearchText}
              onChange={(e) => setUserSearchText(e.target.value)}
              placeholder="Nhập email (ví dụ: tri.hoang@brainmemo.vn) hoặc tên..."
              className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-[#f97316] focus:outline-none dark:border-neutral-700 dark:bg-[#1c1c22] dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />
          </div>

          {/* User Results List */}
          <div className="mt-4 max-h-[300px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {matchedUsers.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-muted-foreground dark:text-neutral-400">
                  Không tìm thấy người dùng có sẵn.
                </p>
                {userSearchText.includes('@') && (
                  <Button
                    type="button"
                    onClick={handleStartChatWithCustomEmail}
                    className="mt-3 bg-[#f97316] hover:bg-[#ea580c] text-white text-xs"
                  >
                    Mở chat với email "{userSearchText}"
                  </Button>
                )}
              </div>
            ) : (
              matchedUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3 hover:border-foreground/20 transition dark:border-neutral-800/80 dark:bg-[#1a1a20] dark:hover:border-neutral-700"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt={u.displayName}
                          className="h-10 w-10 rounded-full object-cover ring-1 ring-border dark:ring-neutral-700"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f97316]/15 font-bold text-xs text-[#f97316] dark:bg-[#f97316]/20">
                          {u.initials || u.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-foreground dark:text-neutral-100 truncate">
                          {u.displayName}
                        </span>
                        {u.roleBadge && (
                          <span
                            className={cn(
                              'text-[10px] font-semibold px-1.5 py-0.2 rounded border',
                              u.roleBadge === 'GV'
                                ? 'border-[#f97316]/70 text-[#f97316]'
                                : u.roleBadge === 'Trợ giảng'
                                ? 'border-emerald-400 text-emerald-700 dark:border-emerald-500/60 dark:text-emerald-400'
                                : 'border-border text-muted-foreground dark:border-neutral-600 dark:text-neutral-400'
                            )}
                          >
                            {u.roleBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground dark:text-neutral-400 truncate">
                        {u.email}
                      </p>
                      {u.courseName && (
                        <p className="text-[11px] text-muted-foreground/80 dark:text-neutral-500 truncate mt-0.5">
                          {u.courseName}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleStartChatWithUser(u)}
                    className="shrink-0 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-semibold px-3 py-1.5 shadow-xs"
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1" />
                    Nhắn tin
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}