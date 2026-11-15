import { useState, useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading,
  List,
  ListOrdered,
  Table as TableIcon,
  Eraser,
  ChevronDown,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Button,
} from '@/shared/ui';

interface TableCellContext {
  inTable: boolean;
  tableEl?: HTMLTableElement;
  rowEl?: HTMLTableRowElement;
  cellEl?: HTMLTableCellElement;
}

interface FloatingTextFormatToolbarProps {
  position: { top: number; left: number } | null;
  onCommand: (command: string, arg?: string) => void;
  onInsertTable: (rows: number, cols: number) => void;
  onTableAction?: (action: 'ADD_ROW_ABOVE' | 'ADD_ROW_BELOW' | 'DELETE_ROW' | 'ADD_COL_LEFT' | 'ADD_COL_RIGHT' | 'DELETE_COL' | 'DELETE_TABLE') => void;
  onToggleCode?: () => void;
  onClose: () => void;
}

export function FloatingTextFormatToolbar({
  position,
  onCommand,
  onInsertTable,
  onTableAction,
  onToggleCode,
  onClose,
}: FloatingTextFormatToolbarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  // Active state trackers
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrike, setIsStrike] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  const [isBullet, setIsBullet] = useState(false);
  const [isNumbered, setIsNumbered] = useState(false);
  const [tableContext, setTableContext] = useState<TableCellContext>({ inTable: false });

  // Table insert popover state
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [isTablePopoverOpen, setIsTablePopoverOpen] = useState(false);

  // Detect active formatting states
  useEffect(() => {
    if (!position) return;

    try {
      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));
      setIsStrike(document.queryCommandState('strikeThrough'));
      setIsBullet(document.queryCommandState('insertUnorderedList'));
      setIsNumbered(document.queryCommandState('insertOrderedList'));

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const node = selection.anchorNode;
        const parent = node?.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);

        // Check code
        const codeNode = parent?.closest('code, pre');
        setIsCode(Boolean(codeNode));

        // Check headings H1-H6
        const headingNode = parent?.closest('h1, h2, h3, h4, h5, h6');
        if (headingNode) {
          setActiveHeading(headingNode.tagName.toUpperCase());
        } else {
          setActiveHeading(null);
        }

        // Check table
        const cell = parent?.closest('td, th') as HTMLTableCellElement | null;
        const row = parent?.closest('tr') as HTMLTableRowElement | null;
        const table = parent?.closest('table') as HTMLTableElement | null;

        if (cell && row && table) {
          setTableContext({
            inTable: true,
            tableEl: table,
            rowEl: row,
            cellEl: cell,
          });
        } else {
          setTableContext({ inTable: false });
        }
      }
    } catch {
      // Ignore queryCommandState issues in unusual iframe/selection contexts
    }
  }, [position]);

  // Click outside listener
  useEffect(() => {
    const handleMouseDownOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDownOutside);
    return () => document.removeEventListener('mousedown', handleMouseDownOutside);
  }, [onClose]);

  if (!position) return null;

  const handleApplyHeading = (tag: string) => {
    if (activeHeading === tag) {
      // Reset to paragraph
      onCommand('formatBlock', '<p>');
    } else {
      onCommand('formatBlock', `<${tag.toLowerCase()}>`);
    }
  };

  const handleApplyCode = () => {
    if (onToggleCode) {
      onToggleCode();
    } else {
      // Fallback
      onCommand('formatBlock', '<code>');
    }
  };

  const handleConfirmInsertTable = () => {
    const rows = Math.max(1, Math.min(20, tableRows || 3));
    const cols = Math.max(1, Math.min(10, tableCols || 3));
    onInsertTable(rows, cols);
    setIsTablePopoverOpen(false);
  };

  return (
    <div
      ref={barRef}
      style={{
        position: 'fixed',
        top: `${Math.max(10, position.top - 54)}px`,
        left: `${Math.max(10, Math.min(position.left, window.innerWidth - 480))}px`,
      }}
      className="z-50 flex items-center gap-0.5 rounded-xl border border-border/90 bg-[#1e1e24] px-1.5 py-1 backdrop-blur-md shadow-2xl text-foreground animate-in fade-in zoom-in-95 duration-100 select-none"
      onMouseDown={(e) => {
        // Prevent loss of selection unless clicking an input
        if ((e.target as HTMLElement).tagName !== 'INPUT') {
          e.preventDefault();
        }
      }}
    >
      {/* 1. In đậm (Bold) */}
      <button
        type="button"
        title="In đậm (Bold)"
        aria-label="In đậm"
        onClick={() => onCommand('bold')}
        className={`rounded-lg p-1.5 transition-colors ${
          isBold
            ? 'bg-[#ff7a1a]/25 text-[#ff7a1a] font-bold ring-1 ring-[#ff7a1a]/50'
            : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
        }`}
      >
        <Bold className="h-3.5 w-3.5" />
      </button>

      {/* 2. In nghiêng (Italic) */}
      <button
        type="button"
        title="In nghiêng (Italic)"
        aria-label="In nghiêng"
        onClick={() => onCommand('italic')}
        className={`rounded-lg p-1.5 transition-colors ${
          isItalic
            ? 'bg-[#ff7a1a]/25 text-[#ff7a1a] font-bold ring-1 ring-[#ff7a1a]/50'
            : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
        }`}
      >
        <Italic className="h-3.5 w-3.5" />
      </button>

      {/* 3. Gạch chân (Underline) */}
      <button
        type="button"
        title="Gạch chân (Underline)"
        aria-label="Gạch chân"
        onClick={() => onCommand('underline')}
        className={`rounded-lg p-1.5 transition-colors ${
          isUnderline
            ? 'bg-[#ff7a1a]/25 text-[#ff7a1a] font-bold ring-1 ring-[#ff7a1a]/50'
            : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
        }`}
      >
        <Underline className="h-3.5 w-3.5" />
      </button>

      {/* 4. Gạch ngang (Strikethrough) */}
      <button
        type="button"
        title="Gạch ngang (Strikethrough)"
        aria-label="Gạch ngang"
        onClick={() => onCommand('strikeThrough')}
        className={`rounded-lg p-1.5 transition-colors ${
          isStrike
            ? 'bg-[#ff7a1a]/25 text-[#ff7a1a] font-bold ring-1 ring-[#ff7a1a]/50'
            : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
        }`}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </button>

      {/* 5. Mã code (<>) */}
      <button
        type="button"
        title="Đoạn mã (Code)"
        aria-label="Mã code"
        onClick={handleApplyCode}
        className={`rounded-lg p-1.5 transition-colors ${
          isCode
            ? 'bg-[#ff7a1a]/25 text-[#ff7a1a] font-bold ring-1 ring-[#ff7a1a]/50'
            : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
        }`}
      >
        <Code className="h-3.5 w-3.5" />
      </button>

      <div className="h-4 w-px bg-border/60 mx-1" />

      {/* 6. Tiêu đề H1 đến H6 Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Định dạng tiêu đề (H1 - H6)"
            aria-label="Định dạng tiêu đề"
            className={`flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs transition-colors ${
              activeHeading
                ? 'bg-[#ff7a1a]/25 text-[#ff7a1a] font-bold ring-1 ring-[#ff7a1a]/50'
                : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            <Heading className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold">
              {activeHeading || 'Tiêu đề'}
            </span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40 text-xs bg-[#1e1e24] border-border/80 text-foreground">
          <DropdownMenuItem onClick={() => handleApplyHeading('H1')}>
            <span className="text-base font-bold font-serif">H1 • Tiêu đề lớn</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleApplyHeading('H2')}>
            <span className="text-sm font-bold font-serif">H2 • Tiêu đề vừa</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleApplyHeading('H3')}>
            <span className="text-xs font-semibold">H3 • Tiêu đề nhỏ</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleApplyHeading('H4')}>
            <span className="text-xs font-medium">H4 • Tiêu đề cấp 4</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleApplyHeading('H5')}>
            <span className="text-[11px] font-medium">H5 • Tiêu đề cấp 5</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleApplyHeading('H6')}>
            <span className="text-[10px] text-muted-foreground font-medium">H6 • Tiêu đề cấp 6</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCommand('formatBlock', '<p>')}>
            <span className="text-xs text-muted-foreground">Văn bản thường (P)</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-4 w-px bg-border/60 mx-1" />

      {/* 7. Gạch đầu dòng (Bullet list) */}
      <button
        type="button"
        title="Gạch đầu dòng (Bullet list)"
        aria-label="Gạch đầu dòng"
        onClick={() => onCommand('insertUnorderedList')}
        className={`rounded-lg p-1.5 transition-colors ${
          isBullet
            ? 'bg-[#ff7a1a]/25 text-[#ff7a1a] font-bold ring-1 ring-[#ff7a1a]/50'
            : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
        }`}
      >
        <List className="h-3.5 w-3.5" />
      </button>

      {/* 8. Thứ tự đầu dòng (Numbered list) */}
      <button
        type="button"
        title="Thứ tự đầu dòng (Numbered list)"
        aria-label="Thứ tự đầu dòng"
        onClick={() => onCommand('insertOrderedList')}
        className={`rounded-lg p-1.5 transition-colors ${
          isNumbered
            ? 'bg-[#ff7a1a]/25 text-[#ff7a1a] font-bold ring-1 ring-[#ff7a1a]/50'
            : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
        }`}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </button>

      <div className="h-4 w-px bg-border/60 mx-1" />

      {/* 9. Bảng: Chọn dòng & cột khi chèn */}
      <div className="relative">
        <button
          type="button"
          title="Chèn bảng tùy chỉnh"
          aria-label="Chèn bảng"
          onClick={() => setIsTablePopoverOpen(!isTablePopoverOpen)}
          className={`rounded-lg p-1.5 transition-colors ${
            isTablePopoverOpen
              ? 'bg-[#ff7a1a]/25 text-[#ff7a1a] font-bold'
              : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }`}
        >
          <TableIcon className="h-3.5 w-3.5" />
        </button>

        {isTablePopoverOpen && (
          <div
            className="absolute left-0 top-full mt-2 w-56 p-3 bg-[#1e1e24] border border-border/80 rounded-xl text-foreground space-y-3 shadow-2xl z-50 animate-in fade-in zoom-in-95"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h4 className="text-xs font-bold text-foreground">Chèn bảng mới</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Số dòng</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={tableRows}
                  onChange={(e) => setTableRows(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded border border-border/80 bg-card px-2 py-1 text-xs text-foreground outline-none focus:border-[#ff7a1a]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Số cột</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={tableCols}
                  onChange={(e) => setTableCols(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded border border-border/80 bg-card px-2 py-1 text-xs text-foreground outline-none focus:border-[#ff7a1a]"
                />
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmInsertTable}
              className="w-full h-7 text-xs bg-[#ff7a1a] hover:bg-[#ff7a1a]/90 text-[#3b1700] font-bold rounded"
            >
              Tạo bảng
            </Button>
          </div>
        )}
      </div>

      {/* Thao tác bảng nếu con trỏ đang ở trong Table */}
      {tableContext.inTable && onTableAction && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Thao tác hàng & cột bảng"
              className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] bg-[#ff7a1a]/15 text-[#ff7a1a] font-semibold border border-[#ff7a1a]/30 transition-colors"
            >
              <span>Sửa bảng</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 text-xs bg-[#1e1e24] border-border/80 text-foreground">
            <DropdownMenuItem onClick={() => onTableAction('ADD_ROW_ABOVE')}>
              <Plus className="h-3.5 w-3.5 mr-2 text-emerald-400" />
              <span>Thêm hàng trên</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTableAction('ADD_ROW_BELOW')}>
              <Plus className="h-3.5 w-3.5 mr-2 text-emerald-400" />
              <span>Thêm hàng dưới</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTableAction('DELETE_ROW')} className="text-red-400 focus:text-red-400">
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              <span>Xóa hàng này</span>
            </DropdownMenuItem>
            <div className="h-px bg-border/60 my-1" />
            <DropdownMenuItem onClick={() => onTableAction('ADD_COL_LEFT')}>
              <Plus className="h-3.5 w-3.5 mr-2 text-emerald-400" />
              <span>Thêm cột trái</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTableAction('ADD_COL_RIGHT')}>
              <Plus className="h-3.5 w-3.5 mr-2 text-emerald-400" />
              <span>Thêm cột phải</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTableAction('DELETE_COL')} className="text-red-400 focus:text-red-400">
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              <span>Xóa cột này</span>
            </DropdownMenuItem>
            <div className="h-px bg-border/60 my-1" />
            <DropdownMenuItem onClick={() => onTableAction('DELETE_TABLE')} className="text-red-500 font-semibold focus:text-red-500">
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              <span>Xóa toàn bộ bảng</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="h-4 w-px bg-border/60 mx-1" />

      {/* 10. Xóa định dạng */}
      <button
        type="button"
        title="Xóa định dạng"
        aria-label="Xóa định dạng"
        onClick={() => onCommand('removeFormat')}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
      >
        <Eraser className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
