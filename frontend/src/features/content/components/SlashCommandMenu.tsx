import { useState, useEffect, useRef, type ComponentType } from 'react';
import {
  AlignLeft,
  FileCode,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Table as TableIcon,
  Image as ImageIcon,
  Video,
  Music,
  Paperclip,
  Sparkles,
  HelpCircle,
  FileUp,
  ListChecks,
  Search,
} from 'lucide-react';
import type { BlockType } from '../api/contentApi';

export interface SlashCommandItem {
  id: string;
  title: string;
  description: string;
  category: 'VĂN BẢN' | 'PHƯƠNG TIỆN' | 'HỌC TẬP & TƯƠNG TÁC';
  icon: ComponentType<{ className?: string }>;
  blockType: BlockType;
  initialFormat?: string; // e.g. 'H2', 'H3', 'BULLET', 'NUMBERED', 'TABLE'
}

const COMMAND_ITEMS: SlashCommandItem[] = [
  // VĂN BẢN
  {
    id: 'rich-text',
    title: 'Rich text',
    description: 'Soạn thảo văn bản thuần với định dạng tự do',
    category: 'VĂN BẢN',
    icon: AlignLeft,
    blockType: 'RICH_TEXT',
  },
  {
    id: 'markdown',
    title: 'Markdown Block',
    description: 'Nhập cú pháp code Markdown trực tiếp',
    category: 'VĂN BẢN',
    icon: FileCode,
    blockType: 'MARKDOWN',
  },
  {
    id: 'heading-2',
    title: 'Tiêu đề H2',
    description: 'Tiêu đề phần chính mục lớn',
    category: 'VĂN BẢN',
    icon: Heading2,
    blockType: 'RICH_TEXT',
    initialFormat: 'H2',
  },
  {
    id: 'heading-3',
    title: 'Tiêu đề H3',
    description: 'Tiêu đề phụ mục nhỏ',
    category: 'VĂN BẢN',
    icon: Heading3,
    blockType: 'RICH_TEXT',
    initialFormat: 'H3',
  },
  {
    id: 'bullet-list',
    title: 'Gạch đầu dòng',
    description: 'Danh sách không có thứ tự',
    category: 'VĂN BẢN',
    icon: List,
    blockType: 'RICH_TEXT',
    initialFormat: 'BULLET',
  },
  {
    id: 'numbered-list',
    title: 'Thứ tự đầu dòng',
    description: 'Danh sách có thứ tự đánh số',
    category: 'VĂN BẢN',
    icon: ListOrdered,
    blockType: 'RICH_TEXT',
    initialFormat: 'NUMBERED',
  },
  {
    id: 'table',
    title: 'Bảng dữ liệu',
    description: 'Chèn bảng dữ liệu dạng lưới 3x3',
    category: 'VĂN BẢN',
    icon: TableIcon,
    blockType: 'RICH_TEXT',
    initialFormat: 'TABLE',
  },
  // PHƯƠNG TIỆN
  {
    id: 'image',
    title: 'Hình ảnh minh họa',
    description: 'Tải tệp ảnh hoặc liên kết sơ đồ minh họa',
    category: 'PHƯƠNG TIỆN',
    icon: ImageIcon,
    blockType: 'IMAGE',
  },
  {
    id: 'video',
    title: 'Video bài giảng',
    description: 'Nhúng video giải thích từ Loom hoặc YouTube',
    category: 'PHƯƠNG TIỆN',
    icon: Video,
    blockType: 'VIDEO',
  },
  {
    id: 'audio',
    title: 'Âm thanh',
    description: 'Nhúng podcast hoặc tệp ghi âm giọng đọc bài giảng',
    category: 'PHƯƠNG TIỆN',
    icon: Music,
    blockType: 'AUDIO',
  },
  {
    id: 'file',
    title: 'Tệp đính kèm',
    description: 'Tải tệp tài liệu PDF hoặc bài tập đính kèm',
    category: 'PHƯƠNG TIỆN',
    icon: Paperclip,
    blockType: 'FILE',
  },
  // HỌC TẬP & TƯƠNG TÁC
  {
    id: 'flashcard',
    title: 'Bộ thẻ nhớ (Flashcard)',
    description: 'Thẻ ghi nhớ ôn tập kiến thức cốt lõi',
    category: 'HỌC TẬP & TƯƠNG TÁC',
    icon: Sparkles,
    blockType: 'FLASHCARD',
  },
  {
    id: 'question',
    title: 'Câu hỏi thực hành',
    description: 'Câu hỏi ôn tập củng cố bài học',
    category: 'HỌC TẬP & TƯƠNG TÁC',
    icon: HelpCircle,
    blockType: 'QUESTION',
  },
  {
    id: 'assignment',
    title: 'Bài tập nộp tệp',
    description: 'Bài tập nộp file bài làm cá nhân',
    category: 'HỌC TẬP & TƯƠNG TÁC',
    icon: FileUp,
    blockType: 'ASSIGNMENT',
  },
  {
    id: 'quiz',
    title: 'Bài kiểm tra (Quiz)',
    description: 'Đề thi trắc nghiệm tính điểm',
    category: 'HỌC TẬP & TƯƠNG TÁC',
    icon: ListChecks,
    blockType: 'QUIZ',
  },
];

interface SlashCommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: SlashCommandItem) => void;
  position?: { top: number; left: number };
}

export function SlashCommandMenu({
  isOpen,
  onClose,
  onSelect,
  position,
}: SlashCommandMenuProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = COMMAND_ITEMS.filter((item) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        onSelect(filteredItems[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  // Group filtered items
  const categories: Array<'VĂN BẢN' | 'PHƯƠNG TIỆN' | 'HỌC TẬP & TƯƠNG TÁC'> = [
    'VĂN BẢN',
    'PHƯƠNG TIỆN',
    'HỌC TẬP & TƯƠNG TÁC',
  ];

  let itemCounter = -1;

  return (
    <div
      ref={containerRef}
      style={
        position
          ? {
              position: 'fixed',
              top: `${Math.min(position.top, window.innerHeight - 380)}px`,
              left: `${Math.min(position.left, window.innerWidth - 340)}px`,
            }
          : undefined
      }
      className="z-50 w-80 max-h-96 rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden text-popover-foreground animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Header title */}
      <div className="px-3 pt-2.5 pb-1 border-b border-border/40 text-[11px] font-bold text-foreground select-none">
        Chọn loại khối nội dung cần thêm
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-2 border-b border-border/70 p-3 bg-muted/20">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Tìm kiếm lệnh hoặc gõ để lọc..."
          className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {/* Commands List */}
      <div className="overflow-y-auto flex-1 p-2 space-y-3 divide-y divide-border/40">
        {filteredItems.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            Không tìm thấy lệnh hoặc khối phù hợp.
          </div>
        ) : (
          categories.map((cat) => {
            const itemsInCat = filteredItems.filter((i) => i.category === cat);
            if (itemsInCat.length === 0) return null;

            return (
              <div key={cat} className="pt-2 first:pt-0">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {cat}
                </div>
                <div className="mt-1 space-y-0.5">
                  {itemsInCat.map((item) => {
                    itemCounter += 1;
                    const isSelected = itemCounter === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelect(item)}
                        onMouseEnter={() => setSelectedIndex(itemCounter)}
                        className={`w-full flex items-center gap-3 rounded-xl p-2 text-left transition-colors ${
                          isSelected
                            ? 'bg-primary/10 text-foreground'
                            : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                            isSelected
                              ? 'border-primary/40 bg-primary/15 text-primary'
                              : 'border-border/60 bg-muted/40 text-muted-foreground'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {item.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
