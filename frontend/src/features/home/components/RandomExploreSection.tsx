import { useState } from 'react';
import { RefreshCw, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui';
import defaultCourseCover from '@/assets/courses';

interface VerticalCardItem {
  id: string;
  title: string;
  authorName: string;
  coverUrl?: string;
  tag: string;
  rating: number;
  learnerCount: number;
}

const POOL_OF_COURSES: VerticalCardItem[] = [
  { id: 'exp-1', title: 'Toán Rời Rạc & Logic Mệnh Đề', authorName: 'PGS. Lê Huy', tag: 'Toán', rating: 4.8, learnerCount: 840 },
  { id: 'exp-2', title: 'An Ninh Mạng & Ethical Hacking', authorName: 'ThS. Đặng Tuấn', tag: 'Bảo mật', rating: 4.9, learnerCount: 1520 },
  { id: 'exp-3', title: 'Lập Trình Go (Golang) Microservices', authorName: 'Kỹ sư Vũ Đạt', tag: 'Backend', rating: 4.7, learnerCount: 690 },
  { id: 'exp-4', title: 'Kỹ Thuật Xử Lý Ngôn Ngữ Tự Nhiên NLP', authorName: 'TS. Đỗ Hoàng Nam', tag: 'AI', rating: 4.9, learnerCount: 1100 },
  { id: 'exp-5', title: 'Lập Trình Di Động Flutter Đa Nền Tảng', authorName: 'ThS. Nguyễn Lan Anh', tag: 'Mobile', rating: 4.8, learnerCount: 1340 },
  { id: 'exp-6', title: 'Hệ Thống Phân Tán với Kafka & RabbitMQ', authorName: 'TS. Trần Khoa', tag: 'Hệ thống', rating: 4.8, learnerCount: 780 },
  { id: 'exp-7', title: 'DevOps với Docker, CI/CD Jenkins', authorName: 'Kỹ sư Vũ Đạt', tag: 'DevOps', rating: 4.9, learnerCount: 2200 },
  { id: 'exp-8', title: 'Thiết Kế Cơ Sở Dữ Liệu NoSQL MongoDB', authorName: 'PGS. Lê Huy', tag: 'Database', rating: 4.6, learnerCount: 910 },
  { id: 'exp-9', title: 'Kiểm Thử Phần Mềm & Test Automation', authorName: 'ThS. Đặng Tuấn', tag: 'QA', rating: 4.7, learnerCount: 650 },
  { id: 'exp-10', title: 'Trực Quan Hóa Dữ Liệu với PowerBI & Tableau', authorName: 'TS. Hoàng Hà', tag: 'Data', rating: 4.8, learnerCount: 1450 },
  { id: 'exp-11', title: 'C++ Hiện Đại & Game Engine Architecture', authorName: 'TS. Trần Khoa', tag: 'C++', rating: 4.9, learnerCount: 880 },
  { id: 'exp-12', title: 'Deep Learning & Thị Giác Máy Tính (CV)', authorName: 'TS. Đỗ Hoàng Nam', tag: 'AI', rating: 4.9, learnerCount: 1980 },
];

export function RandomExploreSection() {
  const [courses, setCourses] = useState(POOL_OF_COURSES.slice(0, 10));
  const [isRotating, setIsRotating] = useState(false);

  const handleShuffle = () => {
    setIsRotating(true);
    const shuffled = [...POOL_OF_COURSES].sort(() => 0.5 - Math.random());
    setCourses(shuffled.slice(0, 10));
    setTimeout(() => setIsRotating(false), 400);
  };

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          <span className="h-6 w-1 rounded-full bg-brand-orange" aria-hidden="true" />
          <h2 className="font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            KHÁM PHÁ NGẪU NHIÊN
          </h2>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleShuffle}
          className="gap-2 text-xs font-semibold"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRotating ? 'animate-spin text-brand-orange' : ''}`} />
          <span>Đổi đề xuất</span>
        </Button>
      </div>

      {/* Grid 2 rows x 5 columns = 10 vertical cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {courses.map((item) => (
          <div
            key={item.id}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition-all hover:border-brand-orange/40 hover:shadow-md"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-muted">
              <img
                src={item.coverUrl || defaultCourseCover}
                alt={item.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <span className="absolute top-2 left-2 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-white">
                {item.tag}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-3.5 space-y-2">
              <h3 className="line-clamp-2 font-serif text-xs sm:text-sm font-bold text-foreground group-hover:text-brand-orange transition-colors">
                <Link to={`/courses/${item.id}`}>{item.title}</Link>
              </h3>

              <p className="text-[11px] text-muted-foreground truncate">
                {item.authorName}
              </p>

              <div className="mt-auto pt-2 flex items-center justify-between text-[11px] border-t border-border/60">
                <span className="flex items-center gap-1 font-semibold text-amber-500">
                  <Star className="h-3 w-3 fill-current" />
                  <span>{item.rating.toFixed(1)}</span>
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{item.learnerCount}</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
