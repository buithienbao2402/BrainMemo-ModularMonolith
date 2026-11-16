import { useState, useId } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useImportQuestionsMutation } from '../api/contentApi';
import { Button } from '@/shared/ui';

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

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [importedCount, setImportedCount] = useState<number>(0);

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
    link.setAttribute('download', 'mau_nhap_cau_hoi_brainmemo.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParseErrors([]);
    setIsSuccess(false);

    // Pre-validation for CSV
    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length <= 1) {
        setParseErrors(['Tệp không chứa dòng dữ liệu câu hỏi nào ngoài tiêu đề.']);
        setPreviewCount(null);
        return;
      }

      const errors: string[] = [];
      const firstLine = lines[0] ?? '';
      const header = firstLine.toLowerCase();
      if (!header.includes('questiontype') || !header.includes('stem')) {
        errors.push('Dòng tiêu đề thiếu cột bắt buộc: QuestionType hoặc Stem.');
      }

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const parts = line.split(',');
        if (parts.length < 2 || !parts[1]?.trim()) {
          errors.push(`Dòng ${i + 1}: Thiếu nội dung câu hỏi (Stem).`);
        }
      }

      setParseErrors(errors);
      setPreviewCount(lines.length - 1);
    } else {
      setPreviewCount(null);
      setParseErrors([]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    try {
      const res = await importMutation.mutateAsync(selectedFile);
      setIsSuccess(true);
      setImportedCount(res.importedCount);
    } catch (err: any) {
      setParseErrors([err.message || 'Lỗi khi nhập câu hỏi từ tệp.']);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl p-6 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 id={titleId} className="text-base font-bold text-foreground">
                Nhập câu hỏi từ bảng tính (SCR-CNT-08)
              </h3>
              <p className="text-xs text-muted-foreground">
                Hỗ trợ tệp định dạng CSV hoặc bảng tính Excel chuẩn
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Đóng">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Sample Download Button */}
          <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-lg text-xs">
            <div>
              <span className="font-semibold text-foreground block">
                Chưa có tệp định dạng mẫu?
              </span>
              <span className="text-muted-foreground">
                Tải tệp CSV mẫu có sẵn ví dụ cho cả 6 loại câu hỏi.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSample}
              className="text-xs flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Tải tệp mẫu
            </Button>
          </div>

          {/* File Picker Zone */}
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
            <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground mb-1">
              Kéo thả tệp vào đây hoặc chọn từ máy tính
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Chấp nhận định dạng .csv hoặc .xlsx
            </p>
            <label className="cursor-pointer">
              <Button variant="secondary" size="sm" type="button" onClick={() => document.getElementById('question-file-input')?.click()}>
                Chọn tệp từ máy
              </Button>
              <input
                id="question-file-input"
                type="file"
                accept=".csv, .xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {selectedFile && (
              <div className="mt-3 text-xs text-primary font-medium">
                Đã chọn: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {/* Preview or Success State */}
          {isSuccess ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <span>Đã nhập thành công {importedCount} câu hỏi vào ngân hàng!</span>
            </div>
          ) : (
            previewCount !== null &&
            parseErrors.length === 0 && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Tìm thấy {previewCount} câu hỏi hợp lệ sẵn sàng nhập.</span>
              </div>
            )
          )}

          {/* Parse Errors List */}
          {parseErrors.length > 0 && (
            <div className="p-3.5 bg-destructive/10 border border-destructive/30 rounded-lg space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>Phát hiện lỗi định dạng:</span>
              </div>
              <ul className="text-xs text-destructive space-y-1 list-disc list-inside">
                {parseErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button variant="secondary" onClick={onClose}>
            {isSuccess ? 'Đóng' : 'Hủy'}
          </Button>
          {!isSuccess && (
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={!selectedFile || parseErrors.length > 0 || importMutation.isPending}
            >
              {importMutation.isPending ? 'Đang nhập câu hỏi...' : 'Tiến hành nhập'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
