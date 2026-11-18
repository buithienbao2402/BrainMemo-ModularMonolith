import { useState, useId } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { useImportQuestionsMutation } from '../api/contentApi';

interface ImportQuestionsModalProps {
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImportQuestionsModal({
  courseId,
  isOpen,
  onClose,
}: ImportQuestionsModalProps) {
  const titleId = useId();
  const importMutation = useImportQuestionsMutation(courseId);

  const [selectedFileName, setSelectedFileName] = useState('Python_Question_Bank_Batch1.xlsx');
  const [selectedFileSize, setSelectedFileSize] = useState('245 KB');
  const [skipErrors, setSkipErrors] = useState(true);
  const [validCount] = useState(120);
  const [errorCount] = useState(3);
  const [totalRows] = useState(123);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleDownloadSample = () => {
    // Generate CSV template locally
    const sampleCsv = `QuestionType,Stem,Options,CorrectAnswer,Explanation,DefaultPoints,Difficulty,Tags
MULTIPLE_CHOICE,Thủ đô của Việt Nam là gì?,"Hà Nội|TP Hồ Chí Minh|Đà Nẵng|Huế",Hà Nội,Hà Nội là thủ đô của Việt Nam,10,1,Địa lý;Việt Nam
TRUE_FALSE,Mặt Trời quay quanh Trái Đất?,"Đúng|Sai",Sai,Trái Đất quay quanh Mặt Trời,10,1,Khoa học
FILL_BLANK,Nước sôi ở nhiệt độ ___ độ C và đóng băng ở ___ độ C.,"100;0",100;0,Nước sôi ở 100 và đóng băng ở 0 độ C,10,1,Vật lý
MATCHING,Ghép cặp các nước và thủ đô.,"Việt Nam=Hà Nội|Pháp=Paris|Nhật Bản=Tokyo",Việt Nam=Hà Nội|Pháp=Paris|Nhật Bản=Tokyo,Thủ đô các quốc gia,10,2,Địa lý
ESSAY,Hãy trình bày định luật vạn vật hấp dẫn của Newton.,,,Định luật được Newton phát biểu năm 1687,20,3,Vật lý
`;
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'mau_nhap_cau_hoi_brainmemo.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setSelectedFileSize(`${(file.size / 1024).toFixed(0)} KB`);
  };

  const handleConfirmImport = async () => {
    try {
      // Mock or mutate
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch {
      // Handle error
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl p-6 sm:p-7 flex flex-col space-y-6 animate-in fade-in-50 zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="h-5 w-5 text-amber-500 shrink-0" />
            <h3 id={titleId} className="font-serif text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Nhập câu hỏi từ Excel/CSV
              <span className="sr-only">Nhập câu hỏi từ bảng tính (SCR-CNT-08)</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="flex items-center justify-between px-2 pt-1 text-xs">
          {/* Step 1: Done */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-xs shadow-xs">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-[11px] text-muted-foreground">Bước 1</span>
              <span className="font-bold text-foreground">Tải tệp</span>
            </div>
          </div>

          {/* Line 1 -> 2: Active */}
          <div className="flex-1 mx-3 h-0.5 bg-brand-orange rounded-full" />

          {/* Step 2: In Progress */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-orange text-white font-bold text-xs shadow-xs">
              2
            </div>
            <div>
              <span className="block text-[11px] text-brand-orange font-medium">Đang thực hiện</span>
              <span className="font-bold text-foreground">Kiểm tra dữ liệu</span>
            </div>
          </div>

          {/* Line 2 -> 3: Next */}
          <div className="flex-1 mx-3 h-0.5 bg-border rounded-full" />

          {/* Step 3: Pending */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold text-xs border border-border">
              3
            </div>
            <div>
              <span className="block text-[11px] text-muted-foreground">Bước 3</span>
              <span className="font-medium text-muted-foreground">Hoàn tất</span>
            </div>
          </div>
        </div>

        {/* File Card & Sample Download */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <span className="font-semibold text-foreground text-xs sm:text-sm block">
                {selectedFileName}{' '}
                <span className="font-normal text-muted-foreground text-xs">({selectedFileSize})</span>
              </span>
              <span className="sr-only">Chấp nhận định dạng .csv hoặc .xlsx</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadSample}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Tải tệp mẫu chuẩn (.xlsx)</span>
            <span className="sr-only">Tải tệp mẫu</span>
          </button>
        </div>

        {/* Validation Result Badges */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{validCount} hợp lệ</span>
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 font-semibold text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{errorCount} lỗi cần sửa</span>
          </span>

          <span className="text-muted-foreground font-medium pl-1">
            Tổng {totalRows} dòng
          </span>
        </div>

        {/* Checkbox: Skip Errors */}
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={skipErrors}
              onChange={(e) => setSkipErrors(e.target.checked)}
              className="h-5 w-5 rounded accent-brand-orange border-border cursor-pointer"
            />
            <span className="font-bold text-foreground text-sm">
              Bỏ qua các dòng lỗi và tiếp tục nhập {validCount} câu hợp lệ
            </span>
          </label>
        </div>

        {/* Guide Link */}
        <div>
          <a
            href="#guide"
            onClick={(e) => e.preventDefault()}
            className="inline-flex items-center gap-1 text-xs text-brand-orange hover:text-[#ea6d10] font-medium"
          >
            <span>Xem hướng dẫn chuẩn hóa file Excel</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Hidden File Input for Re-upload */}
        <input
          id="question-file-input"
          type="file"
          accept=".csv, .xlsx"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Success Alert if completed */}
        {isSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Đã nhập thành công {validCount} câu hỏi vào ngân hàng!</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={importMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#ea6d10] active:bg-[#d8620c] transition-colors"
          >
            <span>Nhập câu hỏi</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
