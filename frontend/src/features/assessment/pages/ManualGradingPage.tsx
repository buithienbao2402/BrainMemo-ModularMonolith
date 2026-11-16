import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  HelpCircle,
  Award,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import {
  useAttemptForReview,
  useGradeAttemptManually,
  useSubmissionForGrading,
  useGradeSubmission,
  type ManualQuestionGradeInput,
} from '../api/assessmentApi';

export function ManualGradingPage() {
  const { courseId = '', kind = '', id = '' } = useParams<{
    courseId: string;
    kind: string;
    id: string;
  }>();
  const navigate = useNavigate();

  const isQuiz = kind === 'QUIZ_ATTEMPT';

  // Quiz queries/mutations
  const {
    data: quizAttempt,
    isLoading: isQuizLoading,
    error: quizError,
  } = useAttemptForReview(isQuiz ? id : '');
  const { mutateAsync: submitQuizGrades, isPending: isQuizSubmitting } =
    useGradeAttemptManually(id);

  // Assignment queries/mutations
  const {
    data: assignmentSubmission,
    isLoading: isAssignmentLoading,
    error: assignmentError,
  } = useSubmissionForGrading(!isQuiz ? id : '');
  const { mutateAsync: submitAssignmentGrade, isPending: isAssignmentSubmitting } =
    useGradeSubmission(id);

  // State for Quiz manual grading
  const [essayGrades, setEssayGrades] = useState<Record<string, { points: number; feedback: string }>>({});
  const [overallFeedback, setOverallFeedback] = useState('');

  // State for Assignment grading
  const [assignmentScore, setAssignmentScore] = useState<number>(0);
  const [assignmentFeedback, setAssignmentFeedback] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isQuiz && quizAttempt?.questions) {
      const initial: Record<string, { points: number; feedback: string }> = {};
      quizAttempt.questions.forEach((q) => {
        initial[q.questionId] = {
          points: q.pointsEarned ?? 0,
          feedback: q.feedback || '',
        };
      });
      setEssayGrades(initial);
    }
  }, [isQuiz, quizAttempt]);

  useEffect(() => {
    if (!isQuiz && assignmentSubmission) {
      setAssignmentScore(assignmentSubmission.score ?? 0);
      setAssignmentFeedback(assignmentSubmission.feedback ?? '');
    }
  }, [isQuiz, assignmentSubmission]);

  const handleQuizGradeChange = (questionId: string, points: number, feedback: string) => {
    setEssayGrades((prev) => ({
      ...prev,
      [questionId]: { points, feedback },
    }));
  };

  const handleSaveQuizGrading = async () => {
    setErrorMsg(null);
    try {
      const gradesPayload: ManualQuestionGradeInput[] = Object.entries(essayGrades).map(
        ([questionId, val]) => ({
          questionId,
          points: val.points,
          feedback: val.feedback,
        }),
      );

      await submitQuizGrades({
        grades: gradesPayload,
        overallFeedback: overallFeedback || undefined,
      });

      setSuccessMsg('Đã lưu điểm bài kiểm tra thành công!');
      setTimeout(() => {
        navigate(`/courses/${courseId}/manage/grading`);
      }, 1500);
    } catch {
      setErrorMsg('Không thể lưu kết quả chấm điểm. Vui lòng kiểm tra lại.');
    }
  };

  const handleSaveAssignmentGrading = async () => {
    setErrorMsg(null);
    if (assignmentScore < 0 || assignmentScore > 100) {
      setErrorMsg('Điểm số phải nằm trong khoảng từ 0 đến 100.');
      return;
    }

    try {
      await submitAssignmentGrade({
        score: assignmentScore,
        feedback: assignmentFeedback || undefined,
      });

      setSuccessMsg('Đã chấm bài tập thành công!');
      setTimeout(() => {
        navigate(`/courses/${courseId}/manage/grading`);
      }, 1500);
    } catch {
      setErrorMsg('Không thể lưu điểm bài tập. Vui lòng thử lại.');
    }
  };

  const isLoading = isQuiz ? isQuizLoading : isAssignmentLoading;
  const error = isQuiz ? quizError : assignmentError;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="rounded-lg bg-destructive/10 p-6 text-destructive border border-destructive/20 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-2" />
          <h2 className="text-lg font-semibold">Không tìm thấy bài làm</h2>
          <p className="text-sm mt-1">Bài nộp không tồn tại hoặc bạn không có quyền chấm bài này.</p>
          <Link to={`/courses/${courseId}/manage/grading`} className="mt-4 inline-block">
            <Button variant="outline">Quay lại hàng đợi</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            to={`/courses/${courseId}/manage/grading`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Trở lại hàng đợi
          </Link>
          <span className="text-sm text-muted-foreground">
            Mã định danh: <code className="bg-muted px-1.5 py-0.5 rounded">{id}</code>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {isQuiz ? <HelpCircle className="w-6 h-6 text-amber-500" /> : <FileText className="w-6 h-6 text-blue-500" />}
              {isQuiz ? 'Chấm điểm bài kiểm tra tự luận' : 'Chấm điểm bài tập nộp file'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Xem chi tiết nội dung nộp của học viên và đánh giá điểm, nhận xét.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-lg bg-green-500/10 text-green-700 dark:text-green-300 text-sm border border-green-500/20 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {successMsg}
          </div>
        )}

        {/* QUIZ ATTEMPT WORKSPACE */}
        {isQuiz && quizAttempt && (
          <div className="space-y-6">
            <div className="bg-card rounded-lg border border-border p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs text-muted-foreground block">Điểm hiện tại</span>
                <span className="text-xl font-bold text-foreground">
                  {quizAttempt.totalScore ?? 0} / {quizAttempt.maxScore}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Trạng thái</span>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    quizAttempt.isFullyGraded
                      ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {quizAttempt.isFullyGraded ? 'Đã hoàn tất chấm' : 'Cần chấm thủ công'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {quizAttempt.questions.map((q, idx) => {
                const currentGrade = essayGrades[q.questionId] || {
                  points: q.pointsEarned ?? 0,
                  feedback: q.feedback || '',
                };

                return (
                  <div
                    key={q.questionId}
                    className="bg-card rounded-lg border border-border p-5 space-y-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Câu {idx + 1} ({q.questionType})
                        </span>
                        <div
                          className="text-foreground font-medium prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: q.stem }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground shrink-0">
                        Tối đa: {q.maxPoints} đ
                      </span>
                    </div>

                    {/* Student answer */}
                    <div className="bg-muted/40 rounded p-4 text-sm space-y-2 border border-border/50">
                      <span className="text-xs font-semibold text-muted-foreground block">
                        Câu trả lời của học viên:
                      </span>
                      {q.studentAnswerText ? (
                        <p className="whitespace-pre-wrap text-foreground font-mono text-xs">
                          {q.studentAnswerText}
                        </p>
                      ) : q.studentSelectedOptionIds && q.studentSelectedOptionIds.length > 0 ? (
                        <p className="text-foreground">
                          Phương án đã chọn: {q.studentSelectedOptionIds.join(', ')}
                        </p>
                      ) : (
                        <span className="text-muted-foreground italic">Không có câu trả lời</span>
                      )}
                    </div>

                    {/* Reference answer if any */}
                    {q.referenceAnswer && (
                      <div className="bg-blue-500/5 rounded p-3 text-xs border border-blue-500/20 text-muted-foreground">
                        <span className="font-semibold text-primary block mb-0.5">Đáp án tham khảo:</span>
                        {q.referenceAnswer}
                      </div>
                    )}

                    {/* Scoring & Feedback */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-border">
                      <div className="sm:col-span-1">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Điểm chấm (0 - {q.maxPoints})
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={q.maxPoints}
                          step={0.5}
                          value={currentGrade.points}
                          onChange={(e) =>
                            handleQuizGradeChange(
                              q.questionId,
                              parseFloat(e.target.value) || 0,
                              currentGrade.feedback,
                            )
                          }
                          className="w-full px-3 py-1.5 border border-border rounded bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Nhận xét câu hỏi
                        </label>
                        <input
                          type="text"
                          value={currentGrade.feedback}
                          placeholder="Ghi chú nhận xét cho câu trả lời này..."
                          onChange={(e) =>
                            handleQuizGradeChange(
                              q.questionId,
                              currentGrade.points,
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-1.5 border border-border rounded bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overall Feedback & Actions */}
            <div className="bg-card rounded-lg border border-border p-5 space-y-4">
              <label className="block text-sm font-semibold text-foreground">
                Nhận xét chung cho cả bài làm
              </label>
              <textarea
                rows={3}
                value={overallFeedback}
                onChange={(e) => setOverallFeedback(e.target.value)}
                placeholder="Nhập nhận xét tổng quan..."
                className="w-full px-3 py-2 border border-border rounded bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex justify-end gap-3">
                <Link to={`/courses/${courseId}/manage/grading`}>
                  <Button variant="outline">Hủy bỏ</Button>
                </Link>
                <Button onClick={handleSaveQuizGrading} disabled={isQuizSubmitting}>
                  {isQuizSubmitting ? 'Đang lưu điểm...' : 'Lưu điểm bài thi'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ASSIGNMENT WORKSPACE */}
        {!isQuiz && assignmentSubmission && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 cols: Student content */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-lg border border-border p-6 space-y-4">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Nội dung bài làm của học viên
                </h3>

                {assignmentSubmission.isLate && (
                  <div className="inline-block px-2.5 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive">
                    Nộp muộn
                  </div>
                )}

                <div className="bg-muted/30 rounded-lg p-4 border border-border min-h-[140px]">
                  {assignmentSubmission.textContent ? (
                    <p className="whitespace-pre-wrap text-sm text-foreground">
                      {assignmentSubmission.textContent}
                    </p>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">
                      Học viên không để lại nội dung văn bản.
                    </span>
                  )}
                </div>

                {/* Attached files */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Tệp đính kèm ({assignmentSubmission.files?.length || 0})
                  </h4>
                  {assignmentSubmission.files && assignmentSubmission.files.length > 0 ? (
                    <div className="space-y-2">
                      {assignmentSubmission.files.map((file) => (
                        <div
                          key={file.storageKey}
                          className="flex items-center justify-between p-3 rounded-lg border border-border bg-background"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-sm font-medium text-foreground truncate">
                              {file.originalFilename}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              ({(file.sizeBytes / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {file.contentType}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Không có tệp đính kèm.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right col: Scoring & Feedback */}
            <div className="space-y-6">
              <div className="bg-card rounded-lg border border-border p-6 space-y-5">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Chấm điểm & Đánh giá
                </h3>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Điểm số (Thang điểm 100)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={assignmentScore}
                    onChange={(e) => setAssignmentScore(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-border rounded bg-background text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Nhận xét giáo viên
                  </label>
                  <textarea
                    rows={6}
                    value={assignmentFeedback}
                    onChange={(e) => setAssignmentFeedback(e.target.value)}
                    placeholder="Góp ý chi tiết về bài làm của học viên..."
                    className="w-full px-3 py-2 border border-border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <Button
                  onClick={handleSaveAssignmentGrading}
                  disabled={isAssignmentSubmitting}
                  className="w-full"
                >
                  {isAssignmentSubmitting ? 'Đang cập nhật...' : 'Xác nhận chấm điểm'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
