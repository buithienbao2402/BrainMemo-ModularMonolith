import { Award, ChevronLeft, Crown, Flame, Medal, Star, TrendingUp, Users } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button, Skeleton } from '@/shared/ui';
import { useTop10Query } from '../api/discoveryApi';

type MetricType = 'LEARNERS' | 'REVIEWS' | 'NOMINATIONS';
type WindowType = 'WEEK' | 'MONTH' | 'ALL_TIME';

export function Top10LeaderboardPage() {
  const [metric, setMetric] = React.useState<MetricType>('LEARNERS');
  const [window, setWindow] = React.useState<WindowType>('WEEK');

  const { data: top10Data = [], isLoading } = useTop10Query(metric, window);

  const metricLabels: Record<MetricType, { label: string; icon: React.ReactNode; unit: string }> = {
    LEARNERS: {
      label: 'Học viên',
      icon: <Users className="h-4 w-4" aria-hidden="true" />,
      unit: 'học viên',
    },
    REVIEWS: {
      label: 'Đánh giá',
      icon: <Star className="h-4 w-4 text-amber-500" aria-hidden="true" />,
      unit: 'đánh giá',
    },
    NOMINATIONS: {
      label: 'Đề cử & Hoàn thành',
      icon: <TrendingUp className="h-4 w-4 text-emerald-500" aria-hidden="true" />,
      unit: 'đề cử',
    },
  };

  const windowLabels: Record<WindowType, string> = {
    WEEK: 'Tuần này',
    MONTH: 'Tháng này',
    ALL_TIME: 'Toàn thời gian',
  };

  const top1 = top10Data.find((x) => x.rank === 1);
  const top2 = top10Data.find((x) => x.rank === 2);
  const top3 = top10Data.find((x) => x.rank === 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb / Navigation */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          to="/"
          className="inline-flex items-center gap-1 font-medium hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Trang chủ
        </Link>
        <span>/</span>
        <span className="font-semibold text-foreground">Bảng xếp hạng Top 10</span>
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-primary/10 to-transparent p-6 sm:p-10 border border-amber-500/20 shadow-sm mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 mb-3 border border-amber-500/20">
              <Crown className="h-4 w-4" />
              SCR-DSC-03 Leaderboard
            </div>
            <h1 className="font-serif text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Bảng Xếp Hạng Top 10 Khóa Học
            </h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-muted-foreground">
              Vinh danh các khóa học tiêu biểu được cộng đồng người học đánh giá cao và tham gia sôi nổi nhất trên BrainMemo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Metric Switcher */}
            <div className="flex rounded-xl border border-border bg-card p-1 shadow-sm">
              {(Object.keys(metricLabels) as MetricType[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    metric === m
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {metricLabels[m].icon}
                  {metricLabels[m].label}
                </button>
              ))}
            </div>

            {/* Window Switcher */}
            <div className="flex rounded-xl border border-border bg-card p-1 shadow-sm">
              {(Object.keys(windowLabels) as WindowType[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWindow(w)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    window === w
                      ? 'bg-secondary text-foreground font-bold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {windowLabels[w]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : top10Data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground mb-4">
            <Award className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Chưa có dữ liệu xếp hạng</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Hệ thống chưa ghi nhận đủ dữ liệu hoạt động trong kỳ này cho chỉ số đã chọn. Hãy quay lại sau hoặc thử kỳ đánh giá khác.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Podium Top 3 */}
          {top1 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-end">
              {/* Rank 2 - Silver */}
              {top2 && top2.course ? (
                <div className="order-2 md:order-1 flex flex-col items-center rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-gradient-to-b from-zinc-200/40 via-card to-card p-6 text-center shadow-md">
                  <div className="relative mb-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-400 font-extrabold text-white text-lg shadow-md ring-4 ring-zinc-300 dark:ring-zinc-600">
                      #2
                    </span>
                    <Medal className="absolute -top-3 -right-2 h-6 w-6 text-zinc-400" />
                  </div>
                  <h3 className="line-clamp-2 font-serif text-base font-bold text-foreground">
                    <Link to={`/courses/${top2.course.id}`} className="hover:text-primary transition-colors">
                      {top2.course.name}
                    </Link>
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {top2.course.owner?.displayName || 'Tác giả'}
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-base font-extrabold text-foreground">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span>{top2.count}</span>
                    <span className="text-xs font-normal text-muted-foreground">{metricLabels[metric].unit}</span>
                  </div>
                  <Button asChild variant="outline" size="sm" className="mt-4 w-full rounded-xl">
                    <Link to={`/courses/${top2.course.id}`}>Xem khóa học</Link>
                  </Button>
                </div>
              ) : (
                <div className="order-2 md:order-1" />
              )}

              {/* Rank 1 - Gold (Winner) */}
              {top1.course && (
                <div className="order-1 md:order-2 flex flex-col items-center rounded-3xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/20 via-card to-card p-8 text-center shadow-xl ring-2 ring-amber-500/20 md:-translate-y-3">
                  <div className="relative mb-4">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 font-black text-white text-2xl shadow-lg ring-4 ring-amber-400/50">
                      #1
                    </span>
                    <Crown className="absolute -top-5 -right-3 h-8 w-8 text-amber-500 fill-amber-500" />
                  </div>
                  <span className="mb-2 inline-block rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs text-amber-700 dark:text-amber-300 font-bold">
                    Quán quân kỳ này
                  </span>
                  <h3 className="line-clamp-2 font-serif text-lg font-extrabold text-foreground">
                    <Link to={`/courses/${top1.course.id}`} className="hover:text-primary transition-colors">
                      {top1.course.name}
                    </Link>
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {top1.course.owner?.displayName || 'Tác giả'}
                  </p>
                  <div className="mt-5 flex items-center gap-2 text-xl font-black text-amber-600 dark:text-amber-400">
                    <Flame className="h-5 w-5 text-amber-500" />
                    <span>{top1.count}</span>
                    <span className="text-xs font-semibold text-muted-foreground">{metricLabels[metric].unit}</span>
                  </div>
                  <Button asChild variant="primary" size="md" className="mt-5 w-full rounded-xl shadow-md">
                    <Link to={`/courses/${top1.course.id}`}>Xem khóa học</Link>
                  </Button>
                </div>
              )}

              {/* Rank 3 - Bronze */}
              {top3 && top3.course ? (
                <div className="order-3 flex flex-col items-center rounded-2xl border border-amber-800/30 dark:border-amber-700/50 bg-gradient-to-b from-amber-800/10 via-card to-card p-6 text-center shadow-md">
                  <div className="relative mb-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-700 font-extrabold text-white text-lg shadow-md ring-4 ring-amber-700/30">
                      #3
                    </span>
                    <Medal className="absolute -top-3 -right-2 h-6 w-6 text-amber-700" />
                  </div>
                  <h3 className="line-clamp-2 font-serif text-base font-bold text-foreground">
                    <Link to={`/courses/${top3.course.id}`} className="hover:text-primary transition-colors">
                      {top3.course.name}
                    </Link>
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {top3.course.owner?.displayName || 'Tác giả'}
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-base font-extrabold text-foreground">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span>{top3.count}</span>
                    <span className="text-xs font-normal text-muted-foreground">{metricLabels[metric].unit}</span>
                  </div>
                  <Button asChild variant="outline" size="sm" className="mt-4 w-full rounded-xl">
                    <Link to={`/courses/${top3.course.id}`}>Xem khóa học</Link>
                  </Button>
                </div>
              ) : (
                <div className="order-3" />
              )}
            </div>
          )}

          {/* Full Top 10 Table / List */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border bg-muted/40 px-6 py-4">
              <h2 className="font-serif text-base font-bold text-foreground flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Toàn bộ danh sách Top 10 ({metricLabels[metric].label} – {windowLabels[window]})
              </h2>
            </div>

            <div className="divide-y divide-border">
              {top10Data.map((item) => {
                if (!item.course) return null;

                return (
                  <div
                    key={item.course.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:px-6 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                          item.rank === 1
                            ? 'bg-amber-500 text-white shadow-sm'
                            : item.rank === 2
                            ? 'bg-zinc-400 text-white shadow-sm'
                            : item.rank === 3
                            ? 'bg-amber-700 text-white shadow-sm'
                            : 'bg-secondary text-foreground'
                        }`}
                      >
                        #{item.rank}
                      </span>

                      <div>
                        <Link
                          to={`/courses/${item.course.id}`}
                          className="font-serif text-sm sm:text-base font-bold text-foreground hover:text-primary transition-colors line-clamp-1"
                        >
                          {item.course.name}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Tác giả: {item.course.owner?.displayName || 'Ẩn danh'}
                          {item.course.tags && item.course.tags.length > 0 && (
                            <span className="ml-2 inline-flex gap-1">
                              {item.course.tags.slice(0, 2).map((t) => (
                                <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  #{t}
                                </span>
                              ))}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6">
                      <div className="text-right">
                        <span className="block text-base font-extrabold text-primary">
                          {item.count}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {metricLabels[metric].unit}
                        </span>
                      </div>

                      <Button asChild variant="outline" size="sm" className="rounded-xl">
                        <Link to={`/courses/${item.course.id}`}>Chi tiết</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
