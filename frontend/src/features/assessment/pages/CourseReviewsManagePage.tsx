import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Star,
  MessageSquare,
  ArrowLeft,
  CornerDownRight,
  Send,
  Filter,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import { useToast } from '@/shared/ui/toastContext';
import {
  useCourseReviews,
  useCourseReviewSummary,
  useReplyReview,
  type CourseReviewDto,
} from '../api/assessmentApi';

export function CourseReviewsManagePage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const { pushToast } = useToast();

  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data: reviewsData, isLoading: isReviewsLoading } = useCourseReviews(courseId, {
    page: 1,
    pageSize: 50,
  });
  const { data: summary, isLoading: isSummaryLoading } = useCourseReviewSummary(courseId);

  const replyMutation = useReplyReview(courseId);

  const handleOpenReply = (review: CourseReviewDto) => {
    setReplyingToId(review.id);
    setReplyText(review.replyText || '');
  };

  const handleCancelReply = () => {
    setReplyingToId(null);
    setReplyText('');
  };

  const handleSubmitReply = async (reviewId: string) => {
    if (!replyText.trim()) {
      pushToast({ title: 'Lỗi', description: 'Vui lòng nhập nội dung phản hồi.', tone: 'error' });
      return;
    }

    try {
      await replyMutation.mutateAsync({
        id: reviewId,
        payload: { replyText: replyText.trim() },
      });
      pushToast({ title: 'Thành công', description: 'Đã gửi phản hồi đánh giá.', tone: 'success' });
      setReplyingToId(null);
      setReplyText('');
    } catch (err: any) {
      pushToast({
        title: 'Lỗi gửi phản hồi',
        description: err?.message || 'Có lỗi xảy ra khi gửi phản hồi.',
        tone: 'error',
      });
    }
  };

  const rawReviews = reviewsData?.items || [];
  const filteredReviews = selectedStarFilter !== null
    ? rawReviews.filter((r) => r.rating === selectedStarFilter)
    : rawReviews;

  const avgRating = summary?.averageRating ?? reviewsData?.avg ?? 5.0;
  const totalCount = summary?.totalReviews ?? reviewsData?.count ?? rawReviews.length;
  const ratingDist = summary?.ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  const isLoading = isReviewsLoading || isSummaryLoading;

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link
              to={`/courses/${courseId}`}
              className="hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Khóa học
            </Link>
            <span>/</span>
            <span>Đánh giá học viên</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-primary" />
            Quản lý đánh giá và nhận xét khóa học
          </h1>
          <p className="text-sm text-muted-foreground">
            Xem ý kiến đánh giá sao của học viên, theo dõi mức độ hài lòng và trực tiếp phản hồi giải đáp.
          </p>
        </div>

        {/* Rating Breakdown Summary Card */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Average Rating Block */}
          <div className="flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-6">
            <div className="text-5xl font-extrabold text-foreground">
              {avgRating.toFixed(1)}
            </div>
            <div className="flex items-center gap-1 text-amber-500 my-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    avgRating >= star
                      ? 'fill-amber-500 text-amber-500'
                      : avgRating >= star - 0.5
                      ? 'fill-amber-300 text-amber-500'
                      : 'text-muted-foreground/40'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Dựa trên <strong>{totalCount}</strong> lượt đánh giá
            </p>
          </div>

          {/* Star Distribution Bars */}
          <div className="md:col-span-2 space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingDist[stars] || 0;
              const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;

              return (
                <button
                  type="button"
                  key={stars}
                  onClick={() =>
                    setSelectedStarFilter(selectedStarFilter === stars ? null : stars)
                  }
                  className={`w-full flex items-center gap-3 text-xs p-1 rounded-md transition-colors ${
                    selectedStarFilter === stars ? 'bg-primary/10 font-bold' : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-1 w-14 shrink-0 text-muted-foreground">
                    <span>{stars}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  </div>

                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="w-16 text-right text-muted-foreground font-mono">
                    {count} ({pct.toFixed(0)}%)
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" />
            Lọc theo sao:
          </span>
          <Button
            size="sm"
            variant={selectedStarFilter === null ? 'primary' : 'outline'}
            onClick={() => setSelectedStarFilter(null)}
            className="text-xs h-7"
          >
            Tất cả ({totalCount})
          </Button>
          {[5, 4, 3, 2, 1].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={selectedStarFilter === s ? 'primary' : 'outline'}
              onClick={() => setSelectedStarFilter(selectedStarFilter === s ? null : s)}
              className="text-xs h-7"
            >
              {s} sao ({ratingDist[s] || 0})
            </Button>
          ))}
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-base font-medium">Chưa có đánh giá nào phù hợp bộ lọc</p>
              <p className="text-xs mt-1">Khi học viên hoàn thành tiến độ khóa học, họ có thể gửi đánh giá sao tại đây.</p>
            </div>
          ) : (
            filteredReviews.map((review) => {
              const isReplying = replyingToId === review.id;

              return (
                <div
                  key={review.id}
                  className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-3 transition-colors"
                >
                  {/* Top user row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                        {review.user?.displayName?.slice(0, 2).toUpperCase() || 'HV'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">
                          {review.user?.displayName || 'Học viên'}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex items-center text-amber-500">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  review.rating >= s
                                    ? 'fill-amber-500 text-amber-500'
                                    : 'text-muted-foreground/30'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comment text */}
                  {review.commentText && (
                    <p className="text-sm text-foreground leading-relaxed pl-1">
                      {review.commentText}
                    </p>
                  )}

                  {/* Existing Instructor Reply */}
                  {review.replyText && !isReplying && (
                    <div className="ml-4 pl-4 border-l-2 border-primary/40 bg-muted/30 rounded-r-lg p-3 text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary flex items-center gap-1">
                          <CornerDownRight className="w-3.5 h-3.5" />
                          Phản hồi của giảng viên
                        </span>
                        {review.repliedAt && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(review.repliedAt).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                      <p className="text-foreground text-xs leading-relaxed">
                        {review.replyText}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenReply(review)}
                        className="text-[11px] text-primary hover:underline font-medium mt-1 inline-block"
                      >
                        Chỉnh sửa phản hồi
                      </button>
                    </div>
                  )}

                  {/* Reply Button when not replied */}
                  {!review.replyText && !isReplying && (
                    <div className="pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenReply(review)}
                        className="text-xs gap-1.5 h-7 text-muted-foreground hover:text-foreground"
                      >
                        <CornerDownRight className="w-3.5 h-3.5" />
                        Phản hồi học viên
                      </Button>
                    </div>
                  )}

                  {/* Inline Reply Form */}
                  {isReplying && (
                    <div className="ml-4 pl-4 border-l-2 border-primary space-y-2 pt-2">
                      <label className="text-xs font-semibold text-foreground block">
                        Nội dung phản hồi giảng viên:
                      </label>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={2}
                        placeholder="Nhập lời cảm ơn hoặc giải đáp thắc mắc cho học viên..."
                        className="w-full rounded-md border border-input bg-background p-2.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelReply}
                          className="text-xs h-7"
                        >
                          Hủy
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSubmitReply(review.id)}
                          disabled={replyMutation.isPending}
                          className="text-xs h-7 gap-1"
                        >
                          <Send className="w-3 h-3" />
                          {replyMutation.isPending ? 'Đang gửi...' : 'Gửi phản hồi'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
