import { FileUp, Calendar, Award, HardDrive } from 'lucide-react';
import { Input } from '@/shared/ui';

export interface AssignmentConfig {
  dueAt?: string | null;
  maxPoints?: number | null;
  maxFileSizeBytes?: number;
}

interface AssignmentBlockEditorProps {
  title?: string | null;
  body?: string | null;
  assignmentConfig?: AssignmentConfig | null;
  onUpdate: (updates: {
    title?: string | null;
    body?: string | null;
    assignmentConfig?: AssignmentConfig;
  }) => void;
}

export function AssignmentBlockEditor({
  title,
  body,
  assignmentConfig,
  onUpdate,
}: AssignmentBlockEditorProps) {
  const currentConfig: AssignmentConfig = assignmentConfig || {
    dueAt: null,
    maxPoints: 10,
    maxFileSizeBytes: 10 * 1024 * 1024,
  };

  const handleConfigChange = (
    field: keyof AssignmentConfig,
    val: string | number | null | undefined
  ) => {
    onUpdate({
      title,
      body,
      assignmentConfig: {
        ...currentConfig,
        [field]: val,
      },
    });
  };

  // Convert ISO string to format YYYY-MM-DDTHH:mm for datetime-local input
  const formatDateTimeLocal = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 border-b border-border pb-2.5">
        <FileUp className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">
          Cấu hình bài tập thực hành (Assignment)
        </h4>
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">
          Tiêu đề bài tập
        </label>
        <Input
          value={title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Ví dụ: Bài tập lớn 1: Xây dựng hệ thống quản lý..."
          className="text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">
          Hướng dẫn & Yêu cầu đề bài
        </label>
        <textarea
          value={body || ''}
          onChange={(e) => onUpdate({ body: e.target.value })}
          placeholder="Mô tả chi tiết yêu cầu, định dạng tệp cần nộp và tiêu chí chấm..."
          rows={3}
          className="w-full rounded-lg border border-border bg-background p-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
        {/* Due Date */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            Hạn chót nộp bài
          </label>
          <Input
            type="datetime-local"
            value={formatDateTimeLocal(currentConfig.dueAt)}
            onChange={(e) =>
              handleConfigChange(
                'dueAt',
                e.target.value ? new Date(e.target.value).toISOString() : null
              )
            }
            className="text-xs"
          />
        </div>

        {/* Max Points */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
            <Award className="h-3.5 w-3.5 text-muted-foreground" />
            Điểm tối đa
          </label>
          <Input
            type="number"
            min={1}
            max={100}
            value={currentConfig.maxPoints ?? 10}
            onChange={(e) =>
              handleConfigChange('maxPoints', Number(e.target.value) || 10)
            }
            className="text-xs"
          />
        </div>

        {/* Max File Size */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
            <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
            Giới hạn kích thước tệp
          </label>
          <select
            value={currentConfig.maxFileSizeBytes ?? 10 * 1024 * 1024}
            onChange={(e) =>
              handleConfigChange('maxFileSizeBytes', Number(e.target.value))
            }
            className="h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value={5 * 1024 * 1024}>5 MB</option>
            <option value={10 * 1024 * 1024}>10 MB</option>
            <option value={20 * 1024 * 1024}>20 MB (Tối đa DEC-05)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
