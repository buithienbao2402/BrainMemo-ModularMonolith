import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Upload,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowLeft,
  X,
  FileCheck,
  Award,
  Save,
  Send,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import {
  useMyAssignmentSubmission,
  useSaveAssignmentDraft,
  useSubmitAssignment,
  type SubmissionFileRefDto,
} from '../api/assignmentApi';

export function AssignmentPlayerPage() {
  const { courseId = '', blockId = '' } = useParams<{ courseId: string; blockId: string }>();
  const navigate = useNavigate();

  const { data: submission, isLoading } = useMyAssignmentSubmission(courseId, blockId);
  const { mutateAsync: saveDraft, isPending: isSavingDraft } = useSaveAssignmentDraft(courseId, blockId);
  const { mutateAsync: submitAssignment, isPending: isSubmitting } = useSubmitAssignment(courseId, blockId);

  const [textContent, setTextContent] = useState('');
  const [files, setFiles] = useState<SubmissionFileRefDto[]>([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  useEffect(() => {
    if (submission) {
      setTextContent(submission.textContent || '');
      setFiles(submission.files || []);
    }
  }, [submission]);

  const isDraft = !submission || submission.status === 'DRAFT';
  const isSubmitted = submission?.status === 'SUBMITTED';
  const isGraded = submission?.status === 'GRADED';

  const handleSaveDraft = async () => {
    try {
      await saveDraft({
        textContent,
        fileUploadKeys: files.map((f) => f.storageKey),
      });
      setNotificationMsg('Đã lưu bản nháp thành công.');
      setTimeout(() => setNotificationMsg(null), 3000);
    } catch {
      setNotificationMsg('Lỗi khi lưu bản nháp.');
    }
  };

  const handleSimulateFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;

    const newFiles: SubmissionFileRefDto[] = Array.from(uploaded).map((file, idx) => ({
      storageKey: `upload_${Date.now()}_${idx}_${file.name}`,
      originalFilename: file.name,
      sizeBytes: file.size,
      contentType: file.type || 'application/octet-stream',
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (storageKey: string) => {
    if (!isDraft) return;
    setFiles((prev) => prev.filter((f) => f.storageKey !== storageKey));
  };

  const handleConfirmSubmit = async () => {
    try {
      await handleSaveDraft();
      await submitAssignment();
      setShowSubmitModal(false);
      setNotificationMsg('Nộp bài tập thành công!');
    } catch {
      setNotificationMsg('Lỗi khi nộp bài tập.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/courses/${courseId}/learn`)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại bài học
          </Button>

          <div className="flex items-center gap-2">
            {isDraft && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Clock className="h-3 w-3 mr-1" />
                Bản nháp
              </span>
            )}
            {isSubmitted && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <FileCheck className="h-3 w-3 mr-1" />
                Đã nộp bài (Chờ chấm)
              </span>
            )}
            {isGraded && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                Đã chấm điểm
              </span>
            )}
            {submission?.isLate && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Nộp muộn
              </span>
            )}
          </div>
        </div>

        {/* Notification message */}
        {notificationMsg && (
          <div className="p-3 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm">
            {notificationMsg}
          </div>
        )}

        {/* Graded Result Card */}
        {isGraded && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-foreground">Kết quả chấm điểm bài tập</h3>
                  <p className="text-xs text-muted-foreground">
                    Đã chấm ngày: {submission?.submittedAt ? new Date(submission.submittedAt).toLocaleDateString('vi-VN') : 'Mới đây'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {submission?.score ?? 0}
                </span>
                <span className="text-sm text-muted-foreground ml-1">/ 10 điểm</span>
              </div>
            </div>

            {submission?.feedback && (
              <div className="p-4 bg-muted/40 rounded-lg border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Nhận xét của giảng viên:
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{submission.feedback}</p>
              </div>
            )}
          </div>
        )}

        {/* Assignment Submission Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bài tập thực hành</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isDraft
                ? 'Hãy nhập câu trả lời hoặc đính kèm các tệp báo cáo/mã nguồn trước hạn chót.'
                : 'Bài làm đã được nộp vào hệ thống.'}
            </p>
          </div>

          {/* Text Content */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span>Nội dung bài làm (văn bản)</span>
              {isDraft && <span className="text-xs text-muted-foreground">{textContent.length} ký tự</span>}
            </label>
            <textarea
              value={textContent}
              onChange={(e) => isDraft && setTextContent(e.target.value)}
              disabled={!isDraft}
              rows={8}
              placeholder="Nhập nội dung trả lời, ghi chú hoặc báo cáo bài tập..."
              className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-75 disabled:cursor-not-allowed resize-y"
            />
          </div>

          {/* Attachments Section */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Tệp đính kèm ({files.length})
            </label>

            {files.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {files.map((file) => (
                  <div
                    key={file.storageKey}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex items-center gap-2.5 truncate mr-2">
                      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="truncate">
                        <p className="text-xs font-medium text-foreground truncate">
                          {file.originalFilename}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {(file.sizeBytes / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    {isDraft && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.storageKey)}
                        className="text-muted-foreground hover:text-rose-500 p-1"
                        title="Xóa tệp"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border border-dashed border-border rounded-lg text-center text-xs text-muted-foreground">
                Chưa có tệp đính kèm nào được tải lên.
              </div>
            )}

            {isDraft && (
              <div className="pt-2">
                <label className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-xs font-medium text-foreground bg-background hover:bg-muted cursor-pointer transition-colors">
                  <Upload className="h-4 w-4 text-primary" />
                  <span>Chọn tệp tải lên (PDF, DOCX, ZIP)</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleSimulateFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {isDraft && (
            <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={isSavingDraft || isSubmitting}
                className="flex items-center gap-1.5"
              >
                <Save className="h-4 w-4" />
                {isSavingDraft ? 'Đang lưu...' : 'Lưu nháp'}
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => setShowSubmitModal(true)}
                disabled={isSubmitting || (!textContent && files.length === 0)}
                className="bg-primary text-primary-foreground flex items-center gap-1.5"
              >
                <Send className="h-4 w-4" />
                Nộp bài tập
              </Button>
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-lg space-y-4">
              <h3 className="text-lg font-bold text-foreground">Xác nhận nộp bài tập</h3>
              <p className="text-sm text-muted-foreground">
                Sau khi nộp, bạn sẽ không thể chỉnh sửa lại bài làm của mình nữa. Bạn có chắc chắn muốn nộp bài ngay bây giờ?
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSubmitModal(false)}
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground"
                >
                  {isSubmitting ? 'Đang nộp...' : 'Xác nhận nộp'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
