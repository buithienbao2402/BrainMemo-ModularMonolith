import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  disabled?: boolean;
}

export function TagInput({
  tags,
  onChange,
  maxTags = 10,
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addTag = () => {
    const trimmed = inputValue.trim().replace(/^#+/, '');
    if (!trimmed) return;

    if (tags.length >= maxTags) {
      setErrorMsg(`Chỉ được thêm tối đa ${maxTags} thẻ.`);
      return;
    }

    if (trimmed.length > 50) {
      setErrorMsg('Mỗi thẻ không được vượt quá 50 ký tự.');
      return;
    }

    if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg('Thẻ này đã tồn tại.');
      return;
    }

    setErrorMsg(null);
    onChange([...tags, trimmed]);
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      e.preventDefault();
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove: number) => {
    setErrorMsg(null);
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-input bg-transparent min-h-[46px] focus-within:ring-1 focus-within:ring-ring">
        {tags.map((tag, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-xs font-medium text-foreground"
          >
            <span>#{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(idx)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={`Xóa thẻ ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}

        {tags.length < maxTags && !disabled && (
          <div className="flex-1 min-w-[120px] flex items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setErrorMsg(null);
              }}
              onKeyDown={handleKeyDown}
              onBlur={addTag}
              placeholder={tags.length === 0 ? 'Nhập thẻ và nhấn Enter (ví dụ: react, csharp)...' : 'Thêm thẻ...'}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none px-1"
            />
          </div>
        )}
      </div>

      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>{errorMsg ? <span className="text-destructive">{errorMsg}</span> : 'Nhấn Enter hoặc dấu phẩy để thêm thẻ'}</span>
        <span>{tags.length} / {maxTags} thẻ</span>
      </div>
    </div>
  );
}
