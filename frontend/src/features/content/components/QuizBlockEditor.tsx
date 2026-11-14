import {
  ListChecks,
  Clock,
  Award,
  Repeat,
  Shuffle,
  Eye,
  Lock,
} from 'lucide-react';
import { Input } from '@/shared/ui';
import type { QuizConfig } from '../api/contentApi';

interface QuizBlockEditorProps {
  title?: string | null;
  quizConfig?: QuizConfig | null;
  onUpdate: (updates: { title?: string | null; quizConfig?: QuizConfig }) => void;
}

export function QuizBlockEditor({
  title,
  quizConfig,
  onUpdate,
}: QuizBlockEditorProps) {
  const currentConfig: QuizConfig = quizConfig || {
    timeLimitMinutes: 45,
    passScore: 70,
    maxAttempts: 3,
    resultDisplay: 'AFTER_SUBMIT',
    shuffleQuestions: true,
    shuffleOptions: true,
    questions: [],
    randomRules: [],
  };

  const handleConfigChange = <K extends keyof QuizConfig>(
    field: K,
    val: QuizConfig[K]
  ) => {
    onUpdate({
      title,
      quizConfig: {
        ...currentConfig,
        [field]: val,
      },
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 border-b border-border pb-2.5">
        <ListChecks className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">
          Cấu hình bài kiểm tra (Quiz Authoring - SCR-CNT-06)
        </h4>
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">
          Tiêu đề bài kiểm tra
        </label>
        <Input
          value={title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Ví dụ: Bài kiểm tra trắc nghiệm giữa kỳ..."
          className="text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
        {/* Time Limit */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            Thời gian làm bài (phút)
          </label>
          <Input
            type="number"
            min={0}
            max={360}
            value={currentConfig.timeLimitMinutes ?? ''}
            onChange={(e) =>
              handleConfigChange(
                'timeLimitMinutes',
                e.target.value ? Number(e.target.value) : null
              )
            }
            placeholder="Để trống = Không giới hạn"
            className="text-xs"
          />
        </div>

        {/* Pass Score */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
            <Award className="h-3.5 w-3.5 text-muted-foreground" />
            Điểm đạt yêu cầu (%)
          </label>
          <Input
            type="number"
            min={0}
            max={100}
            value={currentConfig.passScore ?? 70}
            onChange={(e) =>
              handleConfigChange('passScore', Number(e.target.value) || 0)
            }
            className="text-xs"
          />
        </div>

        {/* Max Attempts */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
            <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
            Số lượt làm tối đa
          </label>
          <Input
            type="number"
            min={1}
            max={20}
            value={currentConfig.maxAttempts ?? ''}
            onChange={(e) =>
              handleConfigChange(
                'maxAttempts',
                e.target.value ? Number(e.target.value) : null
              )
            }
            placeholder="Để trống = Vô hạn"
            className="text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        {/* Result Display Mode */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            Thời điểm hiển thị kết quả
          </label>
          <select
            value={currentConfig.resultDisplay || 'AFTER_SUBMIT'}
            onChange={(e) =>
              handleConfigChange(
                'resultDisplay',
                e.target.value as 'AFTER_EACH_ANSWER' | 'AFTER_SUBMIT' | 'AFTER_CLOSE' | 'AFTER_GRADING'
              )
            }
            className="h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="AFTER_SUBMIT">Ngay sau khi nộp bài</option>
            <option value="AFTER_EACH_ANSWER">Sau mỗi câu trả lời</option>
            <option value="AFTER_CLOSE">Sau khi hết hạn làm bài</option>
            <option value="AFTER_GRADING">Sau khi giảng viên chấm xong</option>
          </select>
        </div>

        {/* Quiz Password */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            Mật khẩu bài thi (Tùy chọn)
          </label>
          <Input
            type="password"
            value={currentConfig.password || ''}
            onChange={(e) =>
              handleConfigChange('password', e.target.value || null)
            }
            placeholder="Để trống nếu không đặt mật khẩu"
            className="text-xs"
          />
        </div>
      </div>

      {/* Shuffling Options */}
      <div className="flex flex-wrap gap-6 pt-2">
        <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(currentConfig.shuffleQuestions)}
            onChange={(e) =>
              handleConfigChange('shuffleQuestions', e.target.checked)
            }
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <Shuffle className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Xáo trộn thứ tự câu hỏi khi làm bài</span>
        </label>

        <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(currentConfig.shuffleOptions)}
            onChange={(e) =>
              handleConfigChange('shuffleOptions', e.target.checked)
            }
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <Shuffle className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Xáo trộn thứ tự các đáp án trong câu hỏi</span>
        </label>
      </div>
    </div>
  );
}
