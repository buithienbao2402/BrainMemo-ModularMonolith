import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ReviewCardItem {
  id: string;
  learnerName: string;
  avatarLetter: string;
  rating: number;
  reviewDate: string;
  courseTitle: string;
  courseId: string;
  comment: string;
}

const MOCK_LATEST_REVIEWS: ReviewCardItem[] = [
  {
    id: 'rev-1',
    learnerName: 'Nguyễn Văn Hùng',
    avatarLetter: 'H',
    rating: 5,
    reviewDate: 'Hôm qua',
    courseTitle: 'Python Nâng Cao & Tối Ưu Thuật Toán',
    courseId: 'crs-01',
    comment: 'Giảng viên giải thích rất kỹ phần tối ưu bộ nhớ và generator. Bài tập thực hành sát với dự án thực tế, rất đáng học!',
  },
  {
    id: 'rev-2',
    learnerName: 'Trần Thị Thu Trang',
    avatarLetter: 'T',
    rating: 5,
    reviewDate: '2 ngày trước',
    courseTitle: 'Trí Tuệ Nhân Tạo & Prompt Engineering',
    courseId: 'crs-02',
    comment: 'Khóa học cung cấp cái nhìn toàn diện từ kỹ thuật Prompt đến xây dựng hệ thống RAG phức tạp. Học xong áp dụng được ngay.',
  },
  {
    id: 'rev-3',
    learnerName: 'Lê Hoàng Long',
    avatarLetter: 'L',
    rating: 5,
    reviewDate: '3 ngày trước',
    courseTitle: 'Cấu Trúc Dữ Liệu & Giải Thuật Thực Chiến',
    courseId: 'crs-03',
    comment: 'Phần trực quan hóa cây nhị phân và đồ thị giúp mình hiểu sâu bản chất thuật toán. Hệ thống chấm quiz tự động rất mượt.',
  },
  {
    id: 'rev-4',
    learnerName: 'Phạm Minh Đức',
    avatarLetter: 'Đ',
    rating: 4,
    reviewDate: '4 ngày trước',
    courseTitle: 'Lập trình Giao diện Web Hiện đại với Next.js',
    courseId: 'crs-04',
    comment: 'Nội dung cập nhật Next.js App Router rất chuẩn. Mong giảng viên bổ sung thêm một chương về tối ưu Core Web Vitals.',
  },
  {
    id: 'rev-5',
    learnerName: 'Đỗ Thùy Linh',
    avatarLetter: 'L',
    rating: 5,
    reviewDate: '5 ngày trước',
    courseTitle: 'Hệ Quản Trị Cơ Sở Dữ Liệu Phân Tán',
    courseId: 'crs-05',
    comment: 'Kiến thức về Sharding và Replication được hệ thống hóa bài bản. Rất phù hợp cho bạn nào đang chuẩn bị phỏng vấn Senior.',
  },
  {
    id: 'rev-6',
    learnerName: 'Vũ Quốc Bảo',
    avatarLetter: 'B',
    rating: 5,
    reviewDate: '1 tuần trước',
    courseTitle: 'Toán Rời Rạc & Logic Mệnh Đề',
    courseId: 'crs-math-05',
    comment: 'Các ví dụ thực tế về ứng dụng đồ thị trong mạng xã hội và định tuyến rất thú vị, xóa tan nỗi sợ môn toán!',
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
      <div className="flex items-center gap-3 border-b border-border/60 pb-3">
        <span className="h-6 w-1 rounded-full bg-brand-orange" aria-hidden="true" />
        <h2 className="font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          ĐÁNH GIÁ MỚI NHẤT
        </h2>
      </div>

      {/* Grid 3 rows x 2 columns = 6 review cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.slice(0, 6).map((rev) => (
          <div
            key={rev.id}
            className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs hover:border-brand-orange/40 transition-colors"
          >
            <div className="space-y-3">
              {/* User header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-orange/15 font-bold text-brand-orange text-sm">
                    {rev.avatarLetter}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{rev.learnerName}</p>
                    <p className="text-[11px] text-muted-foreground">{rev.reviewDate}</p>
                  </div>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-0.5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < rev.rating ? 'fill-current' : 'text-muted stroke-current'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Quote text */}
              <div className="relative">
                <p className="text-xs text-foreground/90 leading-relaxed italic">
                  "{rev.comment}"
                </p>
              </div>
            </div>

            {/* Course Link Footer */}
            <div className="mt-4 pt-3 border-t border-border/60 text-xs">
              <span className="text-muted-foreground">Khóa học: </span>
              <Link
                to={`/courses/${rev.courseId}`}
                className="font-semibold text-brand-orange hover:underline"
              >
                {rev.courseTitle}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
