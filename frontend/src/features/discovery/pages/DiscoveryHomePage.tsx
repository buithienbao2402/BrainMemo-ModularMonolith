import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, RefreshCw, Trophy, BookOpen, Flame, Compass } from 'lucide-react';
import { useAuth } from '@/shared/hooks';
import { Button, Skeleton } from '@/shared/ui';
import { setMockPersonaCookie } from '@mocks/handlers';
import { useHomeDiscoveryQuery, useTop10Query } from '../api/discoveryApi';
import { CourseCardItem } from '../components/CourseCardItem';

const MOCK_PERSONAS = [
  { id: 'guest', label: 'Khách (Guest)' },
  { id: 'user', label: 'Học viên (Quang Trần)' },
  { id: 'unverified', label: 'Chưa xác minh email' },
  { id: 'admin', label: 'Quản trị viên (Admin)' },
] as const;

export function DiscoveryHomePage() {
  const { status, user, refreshAuthSession, logout } = useAuth();
  const isAuthenticated = status === 'authenticated' && Boolean(user);
  const isMockEnabled = import.meta.env.VITE_USE_MOCK === 'true';

  // Query Home data: recentlyUpdated, recommended, inProgress
  // (recommended is random & never cached between mounts per FR-DSC-02)
  const { data: homeData, isLoading, refetch, isFetching } = useHomeDiscoveryQuery();

  // Top 10 controls
  const [top10Metric, setTop10Metric] = useState<'LEARNERS' | 'REVIEWS' | 'NOMINATIONS'>('LEARNERS');
  const [top10Window, setTop10Window] = useState<'WEEK' | 'MONTH' | 'ALL_TIME'>('WEEK');

  const { data: top10Data = [], isLoading: isTop10Loading } = useTop10Query(top10Metric, top10Window);

  const handleSelectPersona = async (persona: (typeof MOCK_PERSONAS)[number]['id']) => {
    setMockPersonaCookie(persona);
    if (persona === 'guest') {
      await logout();
      return;
    }
    await refreshAuthSession();
  };

  const inProgressCourses = homeData?.inProgress || [];
  const recommendedCourses = homeData?.recommended || [];
  const recentlyUpdatedCourses = homeData?.recentlyUpdated || [];

  return (
    <div className="mx-auto max-w-[1280px] space-y-12 px-4 py-8 sm:px-6">
      {/* 1. Hero Section (SCR-DSC-01a / SCR-DSC-01b) */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-8 shadow-sm sm:p-12">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Nền tảng Học tập & Lưu trữ Trí nhớ Não bộ</span>
          </div>

          <h1 className="font-serif text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {isAuthenticated ? (
              <>
                Chào mừng trở lại, <span className="text-primary">{user?.email ? user.email.split('@')[0] : 'bạn'}</span>!
              </>
            ) : (
              <>
                Học tập hiệu quả với <span className="text-primary">Flashcard & Spaced Repetition</span>
              </>
            )}
          </h1>

          <p className="text-base text-muted-foreground sm:text-lg">
            {isAuthenticated
              ? 'Tiếp tục hành trình chinh phục kiến thức và hoàn thành các bài học của bạn ngay hôm nay.'
              : 'Khám phá hàng trăm khóa học trực tuyến chất lượng cao, ghi nhớ dài hạn với kỹ thuật ngắt quãng và hệ thống đề cương bài giảng chuyên sâu.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild size="lg" className="gap-2 font-semibold shadow-md">
              <Link to="/courses">
                <Compass className="h-4 w-4" />
                <span>Khám phá khóa học</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            {!isAuthenticated && (
              <Button asChild variant="outline" size="lg" className="font-semibold">
                <Link to="/register">Bắt đầu học ngay</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* 2. Tiếp tục học dở (inProgress - Chỉ hiển thị khi đã đăng nhập) */}
      {isAuthenticated && inProgressCourses.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Đang học dở
              </h2>
            </div>
            <Link
              to="/me/courses"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Xem tất cả khóa học của tôi →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {inProgressCourses.slice(0, 3).map((course) => (
              <CourseCardItem key={course.id} course={course} showProgress />
            ))}
          </div>
        </section>
      )}

      {/* 3. Khám phá đề xuất ngẫu nhiên (Recommended - Không cache giữa các lần tải FR-DSC-02) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Đề xuất cho bạn
            </h2>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="gap-2 text-xs font-semibold"
            aria-label="Làm mới đề xuất"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
            <span>Đổi gợi ý</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col space-y-3 rounded-xl border border-border p-4">
                <Skeleton className="aspect-[16/9] w-full rounded-lg" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {recommendedCourses.slice(0, 8).map((course) => (
              <CourseCardItem key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Mới cập nhật (Recently Updated) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-rose-500" />
            <h2 className="font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Mới cập nhật
            </h2>
          </div>
          <Link
            to="/courses?sort=RECENTLY_UPDATED"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Xem tất cả →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col space-y-3 rounded-xl border border-border p-4">
                <Skeleton className="aspect-[16/9] w-full rounded-lg" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {recentlyUpdatedCourses.slice(0, 8).map((course) => (
              <CourseCardItem key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>

      {/* 5. Bảng xếp hạng Top 10 (Leaderboard FR-DSC-10) */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 border-b border-border/60 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Bảng xếp hạng Top 10
            </h2>
          </div>

          {/* Metric & Window Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Switcher */}
            <div className="flex rounded-lg border border-border bg-card p-0.5 text-xs font-semibold">
              {[
                { value: 'LEARNERS' as const, label: 'Học viên' },
                { value: 'NOMINATIONS' as const, label: 'Đề cử' },
                { value: 'REVIEWS' as const, label: 'Đánh giá' },
              ].map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setTop10Metric(m.value)}
                  className={`rounded-md px-2.5 py-1 transition-colors ${
                    top10Metric === m.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Window Switcher */}
            <div className="flex rounded-lg border border-border bg-card p-0.5 text-xs font-semibold">
              {[
                { value: 'WEEK' as const, label: 'Tuần' },
                { value: 'MONTH' as const, label: 'Tháng' },
                { value: 'ALL_TIME' as const, label: 'Tất cả' },
              ].map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => setTop10Window(w.value)}
                  className={`rounded-md px-2.5 py-1 transition-colors ${
                    top10Window === w.value
                      ? 'bg-secondary text-foreground font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Top 10 Cards List */}
        {isTop10Loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : top10Data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Chưa có đủ dữ liệu xếp hạng trong kỳ này.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {top10Data.map((item) => {
              if (!item.course) return null;
              return (
                <div
                  key={item.course.id}
                  className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/50"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                      item.rank === 1
                        ? 'bg-amber-500 text-white shadow-sm'
                        : item.rank === 2
                        ? 'bg-zinc-400 text-white'
                        : item.rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    #{item.rank}
                  </span>

                  <div className="flex-1 overflow-hidden">
                    <Link
                      to={`/courses/${item.course.id}`}
                      className="line-clamp-1 font-serif text-sm font-bold text-foreground hover:text-primary"
                    >
                      {item.course.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {item.course.owner?.displayName || 'Tác giả'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="block text-sm font-bold text-primary">
                      {item.count}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {top10Metric === 'LEARNERS'
                        ? 'học viên'
                        : top10Metric === 'NOMINATIONS'
                        ? 'đề cử'
                        : 'đánh giá'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Floating Mock Persona Switcher for Development & QA */}
      {isMockEnabled && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur-md">
          <span className="px-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Mock Persona:
          </span>
          <select
            value={!isAuthenticated ? 'guest' : user?.isAdmin ? 'admin' : !user?.emailVerified ? 'unverified' : 'user'}
            onChange={(e) => void handleSelectPersona(e.target.value as any)}
            className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground focus:outline-none"
            aria-label="Chọn mock persona để kiểm thử"
          >
            {MOCK_PERSONAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
