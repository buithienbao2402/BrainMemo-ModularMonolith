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
import { Button } from '@/shared/ui';

interface TableCellContext {
  inTable: boolean;
  tableEl?: HTMLTableElement;
  rowEl?: HTMLTableRowElement;
  cellEl?: HTMLTableCellElement;
  editableEl?: HTMLElement;
}

interface FloatingTextFormatToolbarProps {
  position: { top: number; left: number } | null;
  onCommand: (command: string, arg?: string) => void;
  onApplyHeading?: (level: 1 | 2 | 3 | 4 | 5 | 6 | 'p') => void;
  onInsertTable: (rows: number, cols: number) => void;
  onToggleCode?: () => void;
  onClose: () => void;
}

export function FloatingTextFormatToolbar({
  position,
  onCommand,
  onApplyHeading,
  onInsertTable,
  onToggleCode,
  onClose,
}: FloatingTextFormatToolbarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // Active format state
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrike, setIsStrike] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  const [isBullet, setIsBullet] = useState(false);
  const [isNumbered, setIsNumbered] = useState(false);

  // Table context and controls
  const [tableContext, setTableContext] = useState<TableCellContext>({ inTable: false });
  const [isTableMenuOpen, setIsTableMenuOpen] = useState(false);
  const [isHeadingMenuOpen, setIsHeadingMenuOpen] = useState(false);
  const [isTablePopoverOpen, setIsTablePopoverOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // Track active formats and table context
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
        const range = selection.getRangeAt(0);
        savedRangeRef.current = range.cloneRange();

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
        const editable = parent?.closest('[contenteditable="true"]') as HTMLElement | null;

        if (cell && row && table) {
          setTableContext({
            inTable: true,
            tableEl: table,
            rowEl: row,
            cellEl: cell,
            editableEl: editable || undefined,
          });
        } else {
          setTableContext({ inTable: false });
        }
      }
    } catch {
      // Ignore queryCommandState issues
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

  // Restore saved selection before executing format commands
  const restoreSelection = () => {
    if (!savedRangeRef.current) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const handleHeadingSelect = (level: 1 | 2 | 3 | 4 | 5 | 6 | 'p') => {
    restoreSelection();
    if (onApplyHeading) {
      onApplyHeading(level);
    } else {
      const tag = level === 'p' ? '<p>' : `<h${level}>`;
      onCommand('formatBlock', tag);
    }
    setIsHeadingMenuOpen(false);
  };

  const handleTableActionInternal = (
    action:
      | 'ADD_ROW_ABOVE'
      | 'ADD_ROW_BELOW'
      | 'DELETE_ROW'
      | 'ADD_COL_LEFT'
      | 'ADD_COL_RIGHT'
      | 'DELETE_COL'
      | 'DELETE_TABLE'
  ) => {
    const { tableEl, rowEl, cellEl, editableEl } = tableContext;
    if (!tableEl) return;

    if (action === 'DELETE_TABLE') {
      const parentEditable = editableEl || (tableEl.closest('[contenteditable="true"]') as HTMLElement);
      tableEl.remove();
      if (parentEditable) {
        parentEditable.dispatchEvent(new Event('input', { bubbles: true }));
        parentEditable.focus();
      }
      setTableContext({ inTable: false });
      setIsTableMenuOpen(false);
      onClose();
      return;
    }

    if (!rowEl || !cellEl) return;

    const cellIndex = cellEl.cellIndex;
    const colCount = rowEl.cells.length;

    if (action === 'ADD_ROW_ABOVE' || action === 'ADD_ROW_BELOW') {
      const newRow = document.createElement('tr');
      for (let i = 0; i < colCount; i++) {
        const td = document.createElement('td');
        td.className = 'border border-border/80 p-2.5';
        td.innerHTML = '<br>';
        newRow.appendChild(td);
      }
      if (action === 'ADD_ROW_ABOVE') {
        rowEl.parentNode?.insertBefore(newRow, rowEl);
      } else {
        if (rowEl.closest('thead')) {
          const tbody = tableEl.querySelector('tbody');
          if (tbody) {
            tbody.insertBefore(newRow, tbody.firstChild);
          } else {
            rowEl.parentNode?.insertBefore(newRow, rowEl.nextSibling);
          }
        } else {
          rowEl.parentNode?.insertBefore(newRow, rowEl.nextSibling);
        }
      }
    } else if (action === 'DELETE_ROW') {
      if (tableEl.querySelectorAll('tr').length <= 1) {
        tableEl.remove();
        setTableContext({ inTable: false });
      } else {
        rowEl.remove();
      }
    } else if (action === 'ADD_COL_LEFT' || action === 'ADD_COL_RIGHT') {
      const insertAt = action === 'ADD_COL_LEFT' ? cellIndex : cellIndex + 1;
      const allRows = tableEl.querySelectorAll('tr');
      allRows.forEach((r) => {
        const isHeader = r.closest('thead') !== null;
        const newCell = document.createElement(isHeader ? 'th' : 'td');
        newCell.className = isHeader
          ? 'border border-border/80 p-2.5 text-left font-semibold bg-muted/40'
          : 'border border-border/80 p-2.5';
        newCell.innerHTML = isHeader ? 'Cột' : '<br>';
        if (insertAt >= r.cells.length) {
          r.appendChild(newCell);
        } else {
          r.insertBefore(newCell, r.cells[insertAt] ?? null);
        }
      });
    } else if (action === 'DELETE_COL') {
      const allRows = tableEl.querySelectorAll('tr');
      if (colCount <= 1) {
        tableEl.remove();
        setTableContext({ inTable: false });
      } else {
        allRows.forEach((r) => {
          if (r.cells[cellIndex]) {
            r.deleteCell(cellIndex);
          }
        });
      }
    }

    const parentEditable = editableEl || (tableEl.closest('[contenteditable="true"]') as HTMLElement);
    if (parentEditable) {
      parentEditable.dispatchEvent(new Event('input', { bubbles: true }));
    }
    setIsTableMenuOpen(false);
  };

  const handleConfirmInsertTable = () => {
    restoreSelection();
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
        left: `${Math.max(10, Math.min(position.left, window.innerWidth - 490))}px`,
      }}
      className="z-50 flex items-center gap-0.5 rounded-xl border border-border bg-popover px-1.5 py-1 backdrop-blur-md shadow-2xl text-popover-foreground animate-in fade-in zoom-in-95 duration-100 select-none"
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
        onMouseDown={(e) => {
          e.preventDefault();
          restoreSelection();
          onCommand('bold');
        }}
        className={`rounded-lg p-1.5 transition-colors ${
          isBold
            ? 'bg-[#ff7a1a]/25 text-[#ff7a1a] font-bold ring-1 ring-[#ff7a1a]/50'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <Bold className="h-3.5 w-3.5" />
      </button>

      {/* 2. In nghiêng (Italic) */}
      <button
        type="button"
        title="In nghiêng (Italic)"
        aria-label="In nghiêng"
        onMouseDown={(e) => {
          e.preventDefault();
          restoreSelection();
          onCommand('italic');
        }}
        className={`rounded-lg p-1.5 transition-colors ${
          isItalic
            ? 'bg-[#ff7a1a]/25 text-[#ff7a1a] font-bold ring-1 ring-[#ff7a1a]/50'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <Italic className="h-3.5 w-3.5" />
      </button>

      {/* 3. Gạch chân (Underline) */}
      <button
        type="button"
        title="Gạch chân (Underline)"
        aria-label="Gạch chân"
        onMouseDown={(e) => {
          e.preventDefault();
          restoreSelection();
          onCommand('underline');
        }}
        className={`rounded-lg p-1.5 transition-colors ${
          isUnderline
            ? 'bg-[#ff7a1a]/25 text-[#ff7a1a] font-bold ring-1 ring-[#ff7a1a]/50'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <Underline className="h-3.5 w-3.5" />
      </button>

      {/* 4. Gạch ngang (Strikethrough) */}
      <button
        type="button"
        title="Gạch ngang (Strikethrough)"
        aria-label="Gạch ngang"
        onMouseDown={(e) => {
          e.preventDefault();
          restoreSelection();
          onCommand('strikeThrough');
        }}
        className={`rounded-lg p-1.5 transition-colors ${
          isStrike
            ? 'bg-[#ff7a1a]/25 text-[#ff7a1a] font-bold ring-1 ring-[#ff7a1a]/50'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </button>

      {/* 5. Mã code (<>) */}
      <button
        type="button"
        title="Đoạn mã (Code)"
        aria-label="Mã code"
        onMouseDown={(e) => {
          e.preventDefault();
          restoreSelection();
          if (onToggleCode) {
            onToggleCode();
          } else {
            onCommand('formatBlock', '<code>');
          }
        }}
        className={`rounded-lg p-1.5 transition-colors ${
          isCode
            ? 'bg-[#ff7a1a]/25 text-[#ff7a1a] font-bold ring-1 ring-[#ff7a1a]/50'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <Code className="h-3.5 w-3.5" />
      </button>

      <div className="h-4 w-px bg-border/80 mx-1" />

      {/* 6. Tiêu đề H1 - H6 Dropdown Menu (Theme sáng & tối) */}
      <div className="relative">
        <button
          type="button"
          title="Định dạng tiêu đề (H1 - H6)"
          aria-label="Định dạng tiêu đề"
          onClick={() => {
            restoreSelection();
            setIsHeadingMenuOpen(!isHeadingMenuOpen);
            setIsTableMenuOpen(false);
            setIsTablePopoverOpen(false);
          }}
          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors ${
            activeHeading
              ? 'bg-[#ff7a1a]/25 text-[#ff7a1a] font-bold ring-1 ring-[#ff7a1a]/50'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Heading className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold">{activeHeading || 'Tiêu đề'}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>

        {isHeadingMenuOpen && (
          <div
            className="absolute left-0 top-full mt-2 w-44 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-2xl z-50 animate-in fade-in zoom-in-95"
            onMouseDown={(e) => e.preventDefault()}
          >
            <button
              type="button"
              onClick={() => handleHeadingSelect(1)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-sm font-bold font-serif hover:bg-muted transition-colors flex items-center justify-between"
            >
              <span>H1 • Tiêu đề lớn</span>
            </button>
            <button
              type="button"
              onClick={() => handleHeadingSelect(2)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold font-serif hover:bg-muted transition-colors flex items-center justify-between"
            >
              <span>H2 • Tiêu đề vừa</span>
            </button>
            <button
              type="button"
              onClick={() => handleHeadingSelect(3)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-muted transition-colors flex items-center justify-between"
            >
              <span>H3 • Tiêu đề nhỏ</span>
            </button>
            <button
              type="button"
              onClick={() => handleHeadingSelect(4)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-muted transition-colors flex items-center justify-between"
            >
              <span>H4 • Tiêu đề cấp 4</span>
            </button>
            <button
              type="button"
              onClick={() => handleHeadingSelect(5)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium hover:bg-muted transition-colors flex items-center justify-between"
            >
              <span>H5 • Tiêu đề cấp 5</span>
            </button>
            <button
              type="button"
              onClick={() => handleHeadingSelect(6)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] text-muted-foreground hover:bg-muted transition-colors flex items-center justify-between"
            >
              <span>H6 • Tiêu đề cấp 6</span>
            </button>
            <div className="h-px bg-border/60 my-1" />
            <button
              type="button"
              onClick={() => handleHeadingSelect('p')}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <span>Văn bản thường (P)</span>
            </button>
          </div>
        )}
      </div>

      <div className="h-4 w-px bg-border/80 mx-1" />

      {/* 7. Gạch đầu dòng (Bullet list) */}
      <button
        type="button"
        title="Gạch đầu dòng (Bullet list)"
        aria-label="Gạch đầu dòng"
        onMouseDown={(e) => {
          e.preventDefault();
          restoreSelection();
          onCommand('insertUnorderedList');
        }}
        className={`rounded-lg p-1.5 transition-colors ${
          isBullet
            ? 'bg-[#ff7a1a]/25 text-[#ff7a1a] font-bold ring-1 ring-[#ff7a1a]/50'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <List className="h-3.5 w-3.5" />
      </button>

      {/* 8. Thứ tự đầu dòng (Numbered list) */}
      <button
        type="button"
        title="Thứ tự đầu dòng (Numbered list)"
        aria-label="Thứ tự đầu dòng"
        onMouseDown={(e) => {
          e.preventDefault();
          restoreSelection();
          onCommand('insertOrderedList');
        }}
        className={`rounded-lg p-1.5 transition-colors ${
          isNumbered
            ? 'bg-[#ff7a1a]/25 text-[#ff7a1a] font-bold ring-1 ring-[#ff7a1a]/50'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </button>

      <div className="h-4 w-px bg-border/80 mx-1" />

      {/* 9. Bảng: Chọn dòng & cột khi chèn */}
      <div className="relative">
        <button
          type="button"
          title="Chèn bảng tùy chỉnh"
          aria-label="Chèn bảng"
          onClick={() => {
            restoreSelection();
            setIsTablePopoverOpen(!isTablePopoverOpen);
            setIsHeadingMenuOpen(false);
            setIsTableMenuOpen(false);
          }}
          className={`rounded-lg p-1.5 transition-colors ${
            isTablePopoverOpen
              ? 'bg-[#ff7a1a]/25 text-[#ff7a1a] font-bold'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <TableIcon className="h-3.5 w-3.5" />
        </button>

        {isTablePopoverOpen && (
          <div
            className="absolute left-0 top-full mt-2 w-56 p-3 bg-popover border border-border rounded-xl text-popover-foreground space-y-3 shadow-2xl z-50 animate-in fade-in zoom-in-95"
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
                  className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-[#ff7a1a]"
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
                  className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-[#ff7a1a]"
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
      {tableContext.inTable && (
        <div className="relative">
          <button
            type="button"
            title="Thao tác hàng & cột bảng"
            onClick={() => {
              setIsTableMenuOpen(!isTableMenuOpen);
              setIsHeadingMenuOpen(false);
              setIsTablePopoverOpen(false);
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] bg-[#ff7a1a]/15 text-[#ff7a1a] font-semibold border border-[#ff7a1a]/30 hover:bg-[#ff7a1a]/25 transition-colors"
          >
            <span>Sửa bảng</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {isTableMenuOpen && (
            <div
              className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-border bg-popover p-1 text-xs text-popover-foreground shadow-2xl z-50 animate-in fade-in zoom-in-95"
              onMouseDown={(e) => e.preventDefault()}
            >
              <button
                type="button"
                onClick={() => handleTableActionInternal('ADD_ROW_ABOVE')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-500" />
                <span>Thêm hàng trên</span>
              </button>
              <button
                type="button"
                onClick={() => handleTableActionInternal('ADD_ROW_BELOW')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-500" />
                <span>Thêm hàng dưới</span>
              </button>
              <button
                type="button"
                onClick={() => handleTableActionInternal('DELETE_ROW')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors flex items-center gap-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa hàng này</span>
              </button>
              <div className="h-px bg-border/60 my-1" />
              <button
                type="button"
                onClick={() => handleTableActionInternal('ADD_COL_LEFT')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-500" />
                <span>Thêm cột trái</span>
              </button>
              <button
                type="button"
                onClick={() => handleTableActionInternal('ADD_COL_RIGHT')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-500" />
                <span>Thêm cột phải</span>
              </button>
              <button
                type="button"
                onClick={() => handleTableActionInternal('DELETE_COL')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors flex items-center gap-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa cột này</span>
              </button>
              <div className="h-px bg-border/60 my-1" />
              <button
                type="button"
                onClick={() => handleTableActionInternal('DELETE_TABLE')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-600 font-semibold transition-colors flex items-center gap-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa toàn bộ bảng</span>
              </button>
            </div>
          )}
        </div>
      )}

      <div className="h-4 w-px bg-border/80 mx-1" />

      {/* 10. Xóa định dạng */}
      <button
        type="button"
        title="Xóa định dạng"
        aria-label="Xóa định dạng"
        onMouseDown={(e) => {
          e.preventDefault();
          restoreSelection();
          onCommand('removeFormat');
        }}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Eraser className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
