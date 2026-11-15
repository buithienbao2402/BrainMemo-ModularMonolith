/**
 * Utilities for cursor positioning, caret navigation across blocks,
 * and DOM selection management.
 */

export function setCaretToStart(element: HTMLElement): void {
  element.focus();
  try {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(true);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  } catch {
    // Ignore in unsupported environments
  }
}

export function setCaretToEnd(element: HTMLElement): void {
  element.focus();
  try {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  } catch {
    // Ignore in unsupported environments
  }
}

/**
 * Check if the caret is currently on the first line (or start) of the editable element.
 */
export function isCaretAtTop(element: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return true;
  try {
    if (element.innerText.trim() === '') return true;

    const range = sel.getRangeAt(0);

    // Direct start check
    if (range.startOffset === 0) {
      let node: Node | null = range.startContainer;
      let atStart = true;
      while (node && node !== element) {
        if (node.previousSibling) {
          atStart = false;
          break;
        }
        node = node.parentNode;
      }
      if (atStart) return true;
    }

    const rects = range.getClientRects();
    const caretRect = rects.length > 0 ? rects[0] : range.getBoundingClientRect();
    const elemRect = element.getBoundingClientRect();

    if (caretRect && elemRect && caretRect.height > 0) {
      // Caret is within the first line height (approx 28px threshold)
      return caretRect.top - elemRect.top <= 28;
    }
    return false;
  } catch {
    return true;
  }
}

/**
 * Check if the caret is currently on the last line (or end) of the editable element.
 */
export function isCaretAtBottom(element: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return true;
  try {
    if (element.innerText.trim() === '') return true;

    const range = sel.getRangeAt(0);

    // Direct end check
    const isAtEndContainer =
      (range.endContainer.nodeType === Node.TEXT_NODE &&
        range.endOffset >= (range.endContainer.textContent?.length || 0)) ||
      (range.endContainer.nodeType === Node.ELEMENT_NODE &&
        range.endOffset >= range.endContainer.childNodes.length);

    if (isAtEndContainer) {
      let node: Node | null = range.endContainer;
      let atEnd = true;
      while (node && node !== element) {
        if (node.nextSibling) {
          atEnd = false;
          break;
        }
        node = node.parentNode;
      }
      if (atEnd) return true;
    }

    const rects = range.getClientRects();
    const caretRect = rects.length > 0 ? rects[0] : range.getBoundingClientRect();
    const elemRect = element.getBoundingClientRect();

    if (caretRect && elemRect && caretRect.height > 0) {
      // Caret is within the last line height (approx 28px threshold)
      return elemRect.bottom - caretRect.bottom <= 28;
    }
    return false;
  } catch {
    return true;
  }
}
