import React, { useState } from 'react';
import {
  Plus,
  AlignLeft,
  FileCode,
  Image as ImageIcon,
  Video,
  Music,
  Paperclip,
  Sparkles,
  HelpCircle,
  FileUp,
  ListChecks,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import type { BlockType } from '../api/contentApi';

interface AddBlockMenuProps {
  onAddBlock: (blockType: BlockType) => void;
}

export function AddBlockMenu({ onAddBlock }: AddBlockMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const blockOptions: Array<{
    type: BlockType;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }> = [
    {
      type: 'RICH_TEXT',
      label: 'Văn bản (Rich Text)',
      description: 'Trình soạn thảo định dạng chữ, danh sách, bảng, trích dẫn',
      icon: AlignLeft,
      color: 'text-blue-500 bg-blue-500/10',
    },
    {
      type: 'MARKDOWN',
      label: 'Markdown',
      description: 'Soạn thảo bằng cú pháp Markdown với xem trước trực quan',
      icon: FileCode,
      color: 'text-indigo-500 bg-indigo-500/10',
    },
    {
      type: 'IMAGE',
      label: 'Hình ảnh',
      description: 'Chèn ảnh minh họa PNG, JPG, WebP tối đa 5 MB',
      icon: ImageIcon,
      color: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      type: 'VIDEO',
      label: 'Video bài giảng',
      description: 'Tải lên hoặc liên kết video MP4, WebM',
      icon: Video,
      color: 'text-rose-500 bg-rose-500/10',
    },
    {
      type: 'AUDIO',
      label: 'Âm thanh (Audio)',
      description: 'Chèn podcast, bài phát âm hoặc audio hướng dẫn',
      icon: Music,
      color: 'text-amber-500 bg-amber-500/10',
    },
    {
      type: 'FILE',
      label: 'Tài liệu đính kèm',
      description: 'Đính kèm tệp PDF, slide bài giảng hoặc mã nguồn ZIP',
      icon: Paperclip,
      color: 'text-cyan-500 bg-cyan-500/10',
    },
    {
      type: 'FLASHCARD',
      label: 'Thẻ ghi nhớ (Flashcard)',
      description: 'Bộ thẻ học hai mặt ôn tập lặp lại ngắt quãng (SRS)',
      icon: Sparkles,
      color: 'text-primary bg-primary/10',
    },
    {
      type: 'QUESTION',
      label: 'Câu hỏi thực hành',
      description: 'Chèn câu hỏi đơn lẻ để học viên làm bài củng cố tại chỗ',
      icon: HelpCircle,
      color: 'text-purple-500 bg-purple-500/10',
    },
    {
      type: 'ASSIGNMENT',
      label: 'Bài tập nộp tệp',
      description: 'Giao bài tập có hạn nộp, thang điểm và tiêu chí nộp bài',
      icon: FileUp,
      color: 'text-orange-500 bg-orange-500/10',
    },
    {
      type: 'QUIZ',
      label: 'Bài kiểm tra (Quiz)',
      description: 'Bài kiểm tra trắc nghiệm, cấu hình thời gian và mật khẩu',
      icon: ListChecks,
      color: 'text-pink-500 bg-pink-500/10',
    },
  ];

  const handleSelect = (type: BlockType) => {
    onAddBlock(type);
    setIsOpen(false);
  };

  return (
    <div className="relative py-2">
      {!isOpen ? (
        <div className="flex items-center justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
            aria-label="Thêm khối nội dung mới"
            className="rounded-full border-dashed border-primary/50 text-primary hover:bg-primary/5 hover:border-primary shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Thêm khối nội dung mới</span>
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-lg animate-in fade-in-50 zoom-in-95 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Chọn loại khối nội dung cần thêm
            </h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-7 text-xs text-muted-foreground"
            >
              Hủy
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {blockOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => handleSelect(opt.type)}
                  className="flex items-start gap-3 rounded-xl border border-border/70 p-3 text-left transition-all hover:border-primary hover:bg-muted/30 group"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${opt.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
