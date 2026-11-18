export type NotificationCategory = 'ALL' | 'UNREAD' | 'LEARNING' | 'INTERACTION' | 'SYSTEM';

export interface RichNotificationItem {
  id: string;
  category: string; // e.g. 'Lời mời nhóm', 'Khóa học', 'Tương tác', 'Đánh giá', 'Chương mới', 'Bảo mật & Kiểm duyệt', 'Quy chuẩn cộng đồng', 'HỆ THỐNG', 'Cột mốc SRS'
  categoryType: 'LEARNING' | 'INTERACTION' | 'SYSTEM' | 'SECURITY';
  timeAgo: string; // e.g. '15 phút trước'
  isUnread: boolean;
  iconType: 'group' | 'course' | 'comment' | 'grade' | 'chapter' | 'security' | 'warning' | 'server' | 'streak';
  title: string;
  body: string;
  scoreBadge?: string; // e.g. '9.5 / 10'
  quoteText?: string; // for comment quote
  primaryAction?: { label: string; actionType?: string }; // e.g. { label: 'Chấp nhận' }
  secondaryAction?: { label: string; actionType?: string }; // e.g. { label: 'Từ chối' }
  linkAction?: { label: string; href?: string }; // e.g. { label: 'Xem thông tin nhóm →' }
  infoNote?: string; // e.g. 'Dữ liệu phiên học sẽ tự động đồng bộ lại khi máy chủ online hoàn tất.'
  timeSection: 'TODAY' | 'THIS_WEEK' | 'OLDER';
}

export const SCREENSHOT_NOTIFICATIONS: RichNotificationItem[] = [
  // 1. HÔM NAY
  {
    id: 'ntf-today-1',
    category: 'Lời mời nhóm',
    categoryType: 'LEARNING',
    timeAgo: '15 phút trước',
    isUnread: true,
    iconType: 'group',
    title: 'Lời mời tham gia nhóm học tập: Giải Tích Chuyên Sâu K24',
    body: 'Giảng viên Nguyễn Văn Vũ đã gửi lời mời bạn tham gia nhóm nghiên cứu và giải bài tập hàng tuần. Hạn chót xác nhận trước 23:59 ngày mai.',
    primaryAction: { label: 'Chấp nhận' },
    secondaryAction: { label: 'Từ chối' },
    linkAction: { label: 'Xem thông tin nhóm →', href: '/groups' },
    timeSection: 'TODAY',
  },
  {
    id: 'ntf-today-2',
    category: 'Khóa học',
    categoryType: 'LEARNING',
    timeAgo: '45 phút trước',
    isUnread: true,
    iconType: 'course',
    title: 'Yêu cầu tham gia khóa học đã được duyệt: Kỹ thuật Prompting & AI Thực Chiến',
    body: 'Chủ khóa học đã phê duyệt tài khoản của bạn vào danh sách lớp cao cấp. Giờ đây bạn đã có quyền truy cập toàn bộ tài liệu giảng dạy và bộ Flashcard đặc quyền.',
    secondaryAction: { label: 'Vào học ngay', actionType: 'navigate' },
    timeSection: 'TODAY',
  },
  {
    id: 'ntf-today-3',
    category: 'Tương tác',
    categoryType: 'INTERACTION',
    timeAgo: '1 giờ trước',
    isUnread: true,
    iconType: 'comment',
    title: 'Trần Bão đã trả lời bình luận của bạn tại Bài 14: Biến đổi Fourier',
    body: '',
    quoteText:
      '“Đoạn biến đổi từ miền thời gian sang tần số rất trực quan nhưng hệ số chuẩn hóa theo công thức Euler có trục quan hóa rất nhiều thứ em lại quên mất xem lại nhé...”',
    linkAction: { label: 'Phản hồi bình luận', href: '/comments' },
    timeSection: 'TODAY',
  },
  {
    id: 'ntf-today-4',
    category: 'Đánh giá',
    categoryType: 'LEARNING',
    timeAgo: '3 giờ trước',
    isUnread: false,
    iconType: 'grade',
    title: 'Bài tập thực hành Lab 03 đã được chấm điểm',
    scoreBadge: '9.5 / 10',
    body: 'Nhận xét từ trợ giảng: “Thuật toán đệ quy có nhớ được tối ưu rất tốt, cách trình bày sạch sẽ và giải thích luồng dữ liệu mạch lạc.”',
    linkAction: { label: 'Xem chi tiết bảng điểm và lời giải mẫu', href: '/grades' },
    timeSection: 'TODAY',
  },

  // 2. TUẦN NÀY
  {
    id: 'ntf-week-1',
    category: 'Chương mới',
    categoryType: 'LEARNING',
    timeAgo: '2 ngày trước',
    isUnread: true,
    iconType: 'chapter',
    title: 'Cấu Trúc Dữ Liệu & Giải Thuật Nâng Cao vừa cập nhật học phần mới',
    body: 'Đã mở: Chương 6 - Đồ thị nâng cao & Thuật toán Dijkstra. Bao gồm 4 bài giảng video chất lượng cao và 35 thẻ ghi nhớ SRS tương ứng.',
    secondaryAction: { label: 'Khám phá chương 6', actionType: 'navigate' },
    timeSection: 'THIS_WEEK',
  },
  {
    id: 'ntf-week-2',
    category: 'Bảo mật & Kiểm duyệt',
    categoryType: 'SECURITY',
    timeAgo: '3 ngày trước',
    isUnread: false,
    iconType: 'security',
    title: 'Báo cáo nội dung vi phạm tại Diễn đàn Lập trình đã được giải quyết',
    body: 'Đội ngũ điều hành đã tiến hành xác minh và gỡ bỏ bài viết quảng cáo spam mà bạn đã báo cáo. Sự cảnh giác của bạn giúp duy trì môi trường học tập thuần khiết cho toàn bộ học viên!',
    timeSection: 'THIS_WEEK',
  },
  {
    id: 'ntf-week-3',
    category: 'Quy chuẩn cộng đồng',
    categoryType: 'SECURITY',
    timeAgo: '4 ngày trước',
    isUnread: false,
    iconType: 'warning',
    title: 'Cảnh báo vi phạm quy chuẩn trao đổi học thuật',
    body: 'Bình luận của bạn tại phần thảo luận khóa "Học Máy Cơ Bản" đã bị ẩn tạm thời do sử dụng từ ngữ không phù hợp. Vui lòng xem lại Quy chuẩn Văn hóa Học tập BrainMemo để tránh bị hạn chế quyền đóng góp ý kiến.',
    linkAction: { label: 'Xem điều khoản ứng xử cộng đồng', href: '/terms' },
    timeSection: 'THIS_WEEK',
  },

  // 3. CŨ HƠN
  {
    id: 'ntf-older-1',
    category: 'HỆ THỐNG',
    categoryType: 'SYSTEM',
    timeAgo: '25/10/2026 14:00',
    isUnread: false,
    iconType: 'server',
    title: 'Bảo trì định kỳ cụm máy chủ & Tối ưu chỉ mục thuật toán SRS',
    body: 'Hệ thống sẽ tiến hành nâng cấp cụm cơ sở dữ liệu lớn từ 02:00 - 04:00 sáng chủ nhật. Tính năng ôn tập Flashcard và đồng bộ bài thi trắc nghiệm sẽ tạm thời chuyển sang chế độ ngoại tuyến (Offline cache).',
    infoNote: 'Dữ liệu phiên học sẽ tự động đồng bộ lại khi máy chủ online hoàn tất.',
    timeSection: 'OLDER',
  },
  {
    id: 'ntf-older-2',
    category: 'Cột mốc SRS',
    categoryType: 'LEARNING',
    timeAgo: '2 tuần trước',
    isUnread: false,
    iconType: 'streak',
    title: 'Chúc mừng bạn đã duy trì chuỗi học tập 14 ngày liên tiếp!',
    body: 'Khả năng ghi nhớ dài hạn của bạn đã tăng thêm 34% theo biểu đồ Forgetting curve của Hermann Ebbinghaus. Bạn nhận được phần thưởng huy hiệu "Học Giả Bền Bỉ" cùng 100 điểm tri thức.',
    timeSection: 'OLDER',
  },
];
