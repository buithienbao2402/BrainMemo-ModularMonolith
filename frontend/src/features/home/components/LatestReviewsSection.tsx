import { Star, ChevronRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ReviewCardItem {
  id: string;
  learnerName: string;
  avatarLetter: string;
  avatarBgColor: string;
  rating: number;
  reviewDate: string;
  courseTitle: string;
  courseId: string;
  comment: string;
}

const MOCK_LATEST_REVIEWS: ReviewCardItem[] = [
  {
    id: 'rev-01',
    learnerName: 'Anh Tuấn',
    avatarLetter: 'AT',
    avatarBgColor: 'bg-amber-600',
    rating: 5,
    reviewDate: '12 phút trước',
    courseTitle: 'Trí Tuệ Nhân Tạo & Kỹ Thuật Prompting Thực Chiến',
    courseId: 'crs-02',
    comment:
      'Khóa học giải thích vô cùng tường minh về các pattern trong Prompt Engineering. Các ví dụ áp dụng thực tiễn giúp mình áp dụng ngay vào công việc tự động hóa văn phòng...',
  },
  {
    id: 'rev-02',
    learnerName: 'Minh Nhật',
    avatarLetter: 'MN',
    avatarBgColor: 'bg-blue-600',
    rating: 5,
    reviewDate: '45 phút trước',
    courseTitle: 'Python Nâng Cao & Tối Ưu Thuật Toán',
    courseId: 'crs-01',
    comment:
      'Hình ảnh minh họa trực quan giúp hiểu nhanh hơn rất nhiều. Lập trình vi điều khiển không còn là nỗi ám ảnh nữa. Cảm ơn thầy nhiều, mong giảng viên ra thêm phần nâng cao...',
  },
  {
    id: 'rev-03',
    learnerName: 'Hương Ly',
    avatarLetter: 'HL',
    avatarBgColor: 'bg-emerald-600',
    rating: 4.8,
    reviewDate: '1 giờ trước',
    courseTitle: 'Toán Rời Rạc & Thiết Kế Logic Thuật Toán',
    courseId: 'crs-03',
    comment:
      'Phần lý thuyết toán rời rạc tưởng chừng khô khan nhưng thầy giảng rất hay. Bài tập phân cấp từ cơ bản đến nâng cao giúp dễ tiếp cận.',
  },
  {
    id: 'rev-04',
    learnerName: 'Quang Minh',
    avatarLetter: 'QM',
    avatarBgColor: 'bg-purple-600',
    rating: 5,
    reviewDate: '2 giờ trước',
    courseTitle: 'Kiến Trúc Frontend Chuyên Nghiệp với React',
    courseId: 'crs-04',
    comment:
      'Kiến thức frontend chuyên sâu và thực tế, giải quyết được nhiều khúc mắc mình gặp phải khi đi làm. Giảng viên hỗ trợ nhiệt tình, tài liệu rất chi tiết.',
  },
  {
    id: 'rev-05',
    learnerName: 'Đăng Khoa',
    avatarLetter: 'ĐK',
    avatarBgColor: 'bg-rose-600',
    rating: 4.8,
    reviewDate: '4 giờ trước',
    courseTitle: 'Vật Lý Đại Cương & Ứng Dụng Mô Phỏng Số',
    courseId: 'crs-05',
    comment:
      'Tôi đã thử nghiệm ứng dụng lý thuyết lượng tử vào mô phỏng vật liệu. Rất mong thầy có thêm khóa học chuyên sâu hơn nữa!',
  },
  {
    id: 'rev-06',
    learnerName: 'Thúy Mi',
    avatarLetter: 'TM',
    avatarBgColor: 'bg-sky-600',
    rating: 5,
    reviewDate: '6 giờ trước',
    courseTitle: 'Phương Pháp Tự Học Siêu Đẳng & Ghi Nhớ',
    courseId: 'crs-stu-10',
    comment:
      'Phương pháp ghi chép thông minh Cornell và Spaced Repetition giúp mình nhớ lâu hơn hẳn. Trước đây mình hay quên các định lý, nay đã nhớ rất tốt!',
  },
];

export function LatestReviewsSection({
  reviews = MOCK_LATEST_REVIEWS,
}: {
  reviews?: ReviewCardItem[];
}) {
  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
        <span className="h-5 w-1 rounded-full bg-brand-orange" aria-hidden="true" />
        <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-foreground">
          ĐÁNH GIÁ MỚI NHẤT
        </h2>
      </div>

      {/* Grid 3 rows x 2 columns = 6 review cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.slice(0, 6).map((rev) => (
          <div
            key={rev.id}
            className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-brand-orange/40 hover:shadow-md"
          >
            <div>
              {/* User header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${rev.avatarBgColor}`}
                  >
                    {rev.avatarLetter}
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-foreground">{rev.learnerName}</p>
                    <p className="text-[11px] text-muted-foreground">{rev.reviewDate}</p>
                  </div>
                </div>

                {/* Stars and Score */}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < Math.floor(rev.rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    {rev.rating.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Quote text */}
              <p className="my-3 text-xs text-foreground/90 leading-relaxed italic line-clamp-3">
                "{rev.comment}"
              </p>
            </div>

            {/* Course Link Footer */}
            <div className="mt-2 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground truncate mr-2">
                <BookOpen className="h-3 w-3 shrink-0" />
                <span className="truncate">{rev.courseTitle}</span>
              </div>
              <Link
                to={`/courses/${rev.courseId}`}
                className="flex items-center gap-0.5 font-semibold text-brand-orange hover:underline shrink-0"
              >
                <span>Xem khóa học</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
