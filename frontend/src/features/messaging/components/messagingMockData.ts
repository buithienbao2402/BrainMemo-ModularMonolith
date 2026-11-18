import type { ConversationDto, MessageDto } from '../api/messagingApi';

export interface StoredMessage extends MessageDto {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderName?: string;
  content: string;
  createdAt: string;
  timeDisplay?: string;
  readAt?: string | null;
}

export interface StoredConversation extends ConversationDto {
  id: string;
  courseId: string;
  courseName: string;
  instructor: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    initials?: string;
    email?: string;
    roleLabel?: string;
    roleBadge?: string;
    isOnline?: boolean;
    isGroupIcon?: boolean;
    isTeachingAssistantIcon?: boolean;
  };
  student: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    email?: string;
  };
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
}

export interface SystemUser {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  initials?: string;
  roleBadge?: string;
  roleLabel?: string;
  courseName?: string;
}

export const SYSTEM_USERS: SystemUser[] = [
  {
    id: 'user-tri',
    displayName: 'TS. Hoàng Minh Trí',
    email: 'tri.hoang@brainmemo.vn',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    roleBadge: 'GV',
    roleLabel: 'Giảng viên hướng dẫn',
    courseName: 'Python cơ bản • Khóa K28',
  },
  {
    id: 'user-thao',
    displayName: 'Lê Hương Thảo',
    email: 'thao.le@brainmemo.vn',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    roleBadge: 'Học viên',
    roleLabel: 'Học viên',
    courseName: 'Ghi nhớ lặp lại SRS',
  },
  {
    id: 'user-hung',
    displayName: 'Nguyễn Văn Hùng',
    email: 'hung.nguyen@brainmemo.vn',
    initials: 'NV',
    roleBadge: 'Học viên',
    roleLabel: 'Học viên',
    courseName: 'Cấu trúc dữ liệu & Giải thuật',
  },
  {
    id: 'user-nam',
    displayName: 'Vũ Đức Nam',
    email: 'nam.vu@brainmemo.vn',
    roleBadge: 'Trợ giảng',
    roleLabel: 'Trợ giảng',
    courseName: 'Hỏi đáp Lab Thực hành',
  },
  {
    id: 'user-long',
    displayName: 'TS. Lê Hoàng Long',
    email: 'long.le@brainmemo.edu.vn',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    roleBadge: 'GV',
    roleLabel: 'Giảng viên chính',
    courseName: 'Cấu Trúc Dữ Liệu & Giải Thuật Nâng Cao',
  },
  {
    id: 'user-duc',
    displayName: 'ThS. Nguyễn Minh Đức',
    email: 'duc.nguyen@brainmemo.edu.vn',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    roleBadge: 'GV',
    roleLabel: 'Giảng viên chính',
    courseName: 'Kỹ Thuật Prompting & AI Thực Chiến',
  },
  {
    id: 'user-co-thao',
    displayName: 'Cô Trần Thảo',
    email: 'thao.tran@brainmemo.edu.vn',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
    roleBadge: 'GV',
    roleLabel: 'Giảng viên',
    courseName: 'Giải Tích Chuyên Sâu 1 & Chuỗi Fourier',
  },
  {
    id: 'user-khang',
    displayName: 'Trần Đình Khang',
    email: 'khang.tran@brainmemo.edu.vn',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80',
    roleBadge: 'Trợ giảng',
    roleLabel: 'Trợ giảng',
    courseName: 'Lập Trình Web Django & FastAPI',
  },
  {
    id: 'user-admin',
    displayName: 'Ban Quản trị BrainMemo',
    email: 'admin@brainmemo.vn',
    roleBadge: 'Admin',
    roleLabel: 'Quản trị viên hệ thống',
    courseName: 'Hỗ trợ kỹ thuật LMS',
  },
];

export const INITIAL_MOCK_CONVERSATIONS: StoredConversation[] = [
  {
    id: 'conv-tri',
    courseId: 'course-python-k28',
    courseName: 'Python cơ bản • Khóa K28',
    instructor: {
      id: 'user-tri',
      displayName: 'TS. Hoàng Minh Trí',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      email: 'tri.hoang@brainmemo.vn',
      roleBadge: 'GV',
      roleLabel: 'Giảng viên hướng dẫn',
      isOnline: true,
    },
    student: {
      id: 'user-quang',
      displayName: 'Quang Trần',
      email: 'quang.tran@brainmemo.vn',
    },
    lastMessageAt: '10:45',
    lastMessagePreview: 'Thầy đã xem qua bài nộp CLO của em rồi...',
    unreadCount: 2,
    createdAt: '2026-11-16T10:30:00Z',
  },
  {
    id: 'conv-thao',
    courseId: 'course-srs',
    courseName: 'Ghi nhớ lặp lại SRS',
    instructor: {
      id: 'user-thao',
      displayName: 'Lê Hương Thảo',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      email: 'thao.le@brainmemo.vn',
      roleBadge: 'Học viên',
      roleLabel: 'Học viên',
      isOnline: true,
    },
    student: {
      id: 'user-quang',
      displayName: 'Quang Trần',
      email: 'quang.tran@brainmemo.vn',
    },
    lastMessageAt: '09:12',
    lastMessagePreview: 'Cậu có ghi chép về thuật toán lặp khoảng các...',
    unreadCount: 1,
    createdAt: '2026-11-16T09:10:00Z',
  },
  {
    id: 'conv-hung',
    courseId: 'course-dsa',
    courseName: 'Cấu trúc dữ liệu & Giải thuật',
    instructor: {
      id: 'user-hung',
      displayName: 'Nguyễn Văn Hùng',
      initials: 'NV',
      email: 'hung.nguyen@brainmemo.vn',
      roleBadge: 'Học viên',
      roleLabel: 'Học viên',
      isOnline: false,
    },
    student: {
      id: 'user-quang',
      displayName: 'Quang Trần',
      email: 'quang.tran@brainmemo.vn',
    },
    lastMessageAt: '2 giờ',
    lastMessagePreview: 'Cảm ơn bạn đã share bộ flashcard Đồ thị nhé,...',
    unreadCount: 0,
    createdAt: '2026-11-16T08:00:00Z',
  },
  {
    id: 'conv-lab',
    courseId: 'course-ai-data-lab',
    courseName: 'Bài tập lớn nhóm 3',
    instructor: {
      id: 'group-lab',
      displayName: 'AI & Data Lab 2026',
      email: 'team-lab@brainmemo.vn',
      roleBadge: '5 tv',
      roleLabel: 'Nhóm học tập',
      isGroupIcon: true,
      isOnline: true,
    },
    student: {
      id: 'user-quang',
      displayName: 'Quang Trần',
      email: 'quang.tran@brainmemo.vn',
    },
    lastMessageAt: 'Hôm qua',
    lastMessagePreview: 'Trần Anh: Hạn nộp báo cáo tiến độ tuần 5 là t...',
    unreadCount: 0,
    createdAt: '2026-11-15T15:00:00Z',
  },
  {
    id: 'conv-nam',
    courseId: 'course-lab-qa',
    courseName: 'Hỏi đáp Lab Thực hành',
    instructor: {
      id: 'user-nam',
      displayName: 'Vũ Đức Nam',
      email: 'nam.vu@brainmemo.vn',
      roleBadge: 'Trợ giảng',
      roleLabel: 'Trợ giảng',
      isTeachingAssistantIcon: true,
      isOnline: true,
    },
    student: {
      id: 'user-quang',
      displayName: 'Quang Trần',
      email: 'quang.tran@brainmemo.vn',
    },
    lastMessageAt: '14/11',
    lastMessagePreview: 'Thắc mắc bài tập câu 4 phần Decorator đã đư...',
    unreadCount: 0,
    createdAt: '2026-11-14T11:00:00Z',
  },
];

export const INITIAL_MOCK_MESSAGES: Record<string, StoredMessage[]> = {
  'conv-tri': [
    {
      id: 'msg-tri-1',
      conversationId: 'conv-tri',
      senderUserId: 'user-tri',
      senderName: 'TS. Hoàng Minh Trí',
      content:
        'Chào Quang, thầy thấy em có để lại thắc mắc ở khối bài tập CLO 3 trong Chương 4 (Chủ đề: Cơ chế tìm kiếm biến theo quy tắc LEGB Scope).',
      createdAt: '2026-11-16T10:30:00Z',
      timeDisplay: '10:30',
    },
    {
      id: 'msg-tri-2',
      conversationId: 'conv-tri',
      senderUserId: 'user-quang',
      senderName: 'Quang Trần (Bạn)',
      content:
        'Dạ em chào Thầy ạ! Em đang phân vân giữa việc áp dụng từ khóa nonlocal và global. Khi chúng ta lồng hàm 3 cấp (nested closures) thì thứ tự tìm kiếm và chỉnh sửa biến của Python diễn ra chính xác theo cơ chế nào ạ?',
      createdAt: '2026-11-16T10:35:00Z',
      timeDisplay: '10:35',
      readAt: '10:36',
    },
    {
      id: 'msg-tri-3',
      conversationId: 'conv-tri',
      senderUserId: 'user-tri',
      senderName: 'TS. Hoàng Minh Trí',
      content:
        'Câu hỏi rất hay! Thứ tự mặc định là L → E → G → B (Local, Enclosing, Global, Built-in). Với lồng 3 cấp, từ khóa nonlocal sẽ duyệt ngược từng tầng Enclosing gần nhất lên trên, nhưng sẽ dừng lại trước cấp Global. Thầy đã đính kèm sơ đồ giải phẫu bộ nhớ này để em dễ hình dung:',
      createdAt: '2026-11-16T10:45:00Z',
      timeDisplay: '10:45',
    },
  ],
  'conv-thao': [
    {
      id: 'msg-thao-1',
      conversationId: 'conv-thao',
      senderUserId: 'user-thao',
      senderName: 'Lê Hương Thảo',
      content: 'Chào Quang, cậu có ghi chép về thuật toán lặp khoảng cách của thẻ Flashcard SRS không?',
      createdAt: '2026-11-16T09:12:00Z',
      timeDisplay: '09:12',
    },
  ],
  'conv-hung': [
    {
      id: 'msg-hung-1',
      conversationId: 'conv-hung',
      senderUserId: 'user-hung',
      senderName: 'Nguyễn Văn Hùng',
      content: 'Cảm ơn bạn đã share bộ flashcard Đồ thị nhé, rất chi tiết và dễ hiểu!',
      createdAt: '2026-11-16T08:00:00Z',
      timeDisplay: '08:00',
    },
  ],
  'conv-lab': [
    {
      id: 'msg-lab-1',
      conversationId: 'conv-lab',
      senderUserId: 'user-tran-anh',
      senderName: 'Trần Anh',
      content: 'Trần Anh: Hạn nộp báo cáo tiến độ tuần 5 là tối mai nhé cả nhóm.',
      createdAt: '2026-11-15T15:00:00Z',
      timeDisplay: 'Hôm qua',
    },
  ],
  'conv-nam': [
    {
      id: 'msg-nam-1',
      conversationId: 'conv-nam',
      senderUserId: 'user-nam',
      senderName: 'Vũ Đức Nam',
      content: 'Thắc mắc bài tập câu 4 phần Decorator đã được giải đáp trên hệ thống rồi nhé!',
      createdAt: '2026-11-14T11:00:00Z',
      timeDisplay: '14/11',
    },
  ],
};

const STORAGE_KEY_CONVS = 'brainmemo_messaging_convs_v2';
const STORAGE_KEY_MSGS = 'brainmemo_messaging_msgs_v2';

export function getStoredConversations(): StoredConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONVS);
    if (!raw) return INITIAL_MOCK_CONVERSATIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_MOCK_CONVERSATIONS;
  } catch {
    return INITIAL_MOCK_CONVERSATIONS;
  }
}

export function saveStoredConversations(convs: StoredConversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONVS, JSON.stringify(convs));
  } catch {
    // Ignore storage quota
  }
}

export function getStoredMessages(convId: string): StoredMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MSGS);
    const map: Record<string, StoredMessage[]> = raw ? JSON.parse(raw) : INITIAL_MOCK_MESSAGES;
    return map[convId] ?? INITIAL_MOCK_MESSAGES[convId] ?? [];
  } catch {
    return INITIAL_MOCK_MESSAGES[convId] ?? [];
  }
}

export function appendStoredMessage(convId: string, message: StoredMessage): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MSGS);
    const map: Record<string, StoredMessage[]> = raw ? JSON.parse(raw) : { ...INITIAL_MOCK_MESSAGES };
    const current = map[convId] ?? INITIAL_MOCK_MESSAGES[convId] ?? [];
    map[convId] = [...current, message];
    localStorage.setItem(STORAGE_KEY_MSGS, JSON.stringify(map));

    // Also update last message in conversation
    const convs = getStoredConversations();
    const targetConv = convs.find((c) => c.id === convId);
    if (targetConv) {
      targetConv.lastMessagePreview = message.content;
      targetConv.lastMessageAt = message.timeDisplay || 'Vừa xong';
      saveStoredConversations(convs);
    }
  } catch {
    // Ignore
  }
}

export function markStoredConversationAsRead(convId: string): void {
  const convs = getStoredConversations();
  let changed = false;
  convs.forEach((c) => {
    if (c.id === convId && c.unreadCount > 0) {
      c.unreadCount = 0;
      changed = true;
    }
  });
  if (changed) {
    saveStoredConversations(convs);
  }
}

export function markAllStoredConversationsAsRead(): void {
  const convs = getStoredConversations();
  convs.forEach((c) => {
    c.unreadCount = 0;
  });
  saveStoredConversations(convs);
}

/**
 * Creates or retrieves an existing conversation with a target user (e.g. from their profile or user search)
 */
export function getOrCreateUserConversation(target: {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  roleBadge?: string;
  courseName?: string;
}): string {
  const convs = getStoredConversations();
  const existing = convs.find(
    (c) =>
      c.instructor?.id === target.userId ||
      c.instructor?.email === target.email ||
      c.student?.id === target.userId
  );

  if (existing) {
    return existing.id;
  }

  const newId = `conv-${target.userId || Date.now()}`;
  const newConv: StoredConversation = {
    id: newId,
    courseId: `course-${target.userId}`,
    courseName: target.courseName || 'Trao đổi trực tiếp',
    instructor: {
      id: target.userId,
      displayName: target.displayName,
      avatarUrl: target.avatarUrl,
      email: target.email,
      roleBadge: target.roleBadge || 'Thành viên',
      roleLabel: target.roleBadge || 'Thành viên',
      isOnline: true,
    },
    student: {
      id: 'user-quang',
      displayName: 'Quang Trần',
      email: 'quang.tran@brainmemo.vn',
    },
    lastMessageAt: 'Vừa xong',
    lastMessagePreview: 'Bắt đầu cuộc trò chuyện',
    unreadCount: 0,
    createdAt: new Date().toISOString(),
  };

  const updated = [newConv, ...convs];
  saveStoredConversations(updated);
  return newId;
}
