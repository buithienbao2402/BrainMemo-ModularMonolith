/**
 * RichText Document AST Specification & Converters (JSON <-> HTML / DOM)
 * Allows storing formatted content as structured JSON in database,
 * and rendering it as clean semantic DOM nodes in Frontend.
 */

export type RichTextMarkType = 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'link';

export interface RichTextMark {
  type: RichTextMarkType;
  attrs?: Record<string, string>;
}

export type RichTextNodeType =
  | 'text'
  | 'paragraph'
  | 'heading'
  | 'bulletList'
  | 'orderedList'
  | 'listItem'
  | 'codeBlock'
  | 'table'
  | 'tableRow'
  | 'tableCell'
  | 'tableHeader'
  | 'blockquote'
  | 'hardBreak';

export interface RichTextNode {
  type: RichTextNodeType;
  attrs?: {
    level?: number;
    href?: string;
    target?: string;
    colspan?: number;
    rowspan?: number;
    [key: string]: unknown;
  };
  marks?: RichTextMark[];
  text?: string;
  content?: RichTextNode[];
}

export interface RichDocumentJson {
  type: 'doc';
  version: 1;
  content: RichTextNode[];
}

/**
 * Creates an empty RichDocumentJson.
 */
export function createEmptyRichDocJson(): RichDocumentJson {
  return {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'paragraph',
        content: [],
      },
    ],
  };
}

/**
 * Check if a string is a valid JSON RichDocumentJson.
 */
export function isRichDocumentJsonString(str: string | null | undefined): boolean {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return false;
  try {
    const parsed = JSON.parse(trimmed);
    return Boolean(parsed && typeof parsed === 'object' && parsed.type === 'doc');
  } catch {
    return false;
  }
}

/**
 * Check if document JSON is empty (contains no text or only empty paragraph).
 */
export function isRichDocEmpty(docOrJson: RichDocumentJson | string | null | undefined): boolean {
  if (!docOrJson) return true;
  let doc: RichDocumentJson;
  if (typeof docOrJson === 'string') {
    if (!isRichDocumentJsonString(docOrJson)) {
      const stripped = docOrJson.replace(/<[^>]+>/g, '').trim();
      return stripped === '';
    }
    try {
      doc = JSON.parse(docOrJson);
    } catch {
      return true;
    }
  } else {
    doc = docOrJson;
  }

  if (!doc.content || doc.content.length === 0) return true;
  if (doc.content.length === 1) {
    const single = doc.content[0];
    if (single && single.type === 'paragraph') {
      if (!single.content || single.content.length === 0) return true;
      const allText = single.content.map((c) => c.text || '').join('').trim();
      return allText === '';
    }
  }
  return false;
}

/**
 * Convert inline DOM elements (and text nodes) into an array of inline RichTextNodes with marks.
 */
function parseInlineNodes(node: Node, currentMarks: RichTextMark[] = []): RichTextNode[] {
  const result: RichTextNode[] = [];

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (text) {
      result.push({
        type: 'text',
        text,
        marks: currentMarks.length > 0 ? [...currentMarks] : undefined,
      });
    }
    return result;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return result;

  const element = node as HTMLElement;
  const tag = element.tagName.toUpperCase();

  const nextMarks = [...currentMarks];
  if (tag === 'B' || tag === 'STRONG') {
    if (!nextMarks.some((m) => m.type === 'bold')) nextMarks.push({ type: 'bold' });
  } else if (tag === 'I' || tag === 'EM') {
    if (!nextMarks.some((m) => m.type === 'italic')) nextMarks.push({ type: 'italic' });
  } else if (tag === 'U') {
    if (!nextMarks.some((m) => m.type === 'underline')) nextMarks.push({ type: 'underline' });
  } else if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') {
    if (!nextMarks.some((m) => m.type === 'strike')) nextMarks.push({ type: 'strike' });
  } else if (tag === 'CODE') {
    if (!nextMarks.some((m) => m.type === 'code')) nextMarks.push({ type: 'code' });
  } else if (tag === 'A') {
    const href = element.getAttribute('href') || '#';
    nextMarks.push({ type: 'link', attrs: { href } });
  } else if (tag === 'BR') {
    result.push({ type: 'hardBreak' });
    return result;
  }

  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];
    if (child) {
      result.push(...parseInlineNodes(child, nextMarks));
    }
  }

  return result;
}

/**
 * Parse an HTML string into structured RichDocumentJson.
 */
export function htmlToRichJson(html: string): RichDocumentJson {
  if (!html || typeof html !== 'string') {
    return createEmptyRichDocJson();
  }

  // If input is already valid RichDocumentJson string, parse and return
  if (isRichDocumentJsonString(html)) {
    try {
      return JSON.parse(html) as RichDocumentJson;
    } catch {
      // Fallback to HTML parser
    }
  }

  if (typeof DOMParser === 'undefined') {
    // Server-side fallback
    return {
      type: 'doc',
      version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: html }] }],
    };
  }

  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(html, 'text/html');
  const body = parsedDoc.body;

  const content: RichTextNode[] = [];

  function processBlockNode(node: Node): RichTextNode | null {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (!text) return null;
      return {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      };
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();

    // Headings H1..H6
    if (/^H[1-6]$/.test(tag)) {
      const level = parseInt(tag.charAt(1), 10);
      const inline = parseInlineNodes(el);
      return {
        type: 'heading',
        attrs: { level },
        content: inline,
      };
    }

    // Paragraph or Div
    if (tag === 'P' || tag === 'DIV') {
      const inline = parseInlineNodes(el);
      return {
        type: 'paragraph',
        content: inline,
      };
    }

    // Lists
    if (tag === 'UL') {
      const items: RichTextNode[] = [];
      for (let i = 0; i < el.children.length; i++) {
        const li = el.children[i];
        if (li && li.tagName.toUpperCase() === 'LI') {
          const inline = parseInlineNodes(li);
          items.push({
            type: 'listItem',
            content: [{ type: 'paragraph', content: inline }],
          });
        }
      }
      return {
        type: 'bulletList',
        content: items,
      };
    }

    if (tag === 'OL') {
      const items: RichTextNode[] = [];
      for (let i = 0; i < el.children.length; i++) {
        const li = el.children[i];
        if (li && li.tagName.toUpperCase() === 'LI') {
          const inline = parseInlineNodes(li);
          items.push({
            type: 'listItem',
            content: [{ type: 'paragraph', content: inline }],
          });
        }
      }
      return {
        type: 'orderedList',
        content: items,
      };
    }

    // Code block
    if (tag === 'PRE') {
      const codeEl = el.querySelector('code') || el;
      return {
        type: 'codeBlock',
        content: [{ type: 'text', text: codeEl.textContent || '' }],
      };
    }

    // Table
    if (tag === 'TABLE') {
      const rows: RichTextNode[] = [];
      const trList = el.querySelectorAll('tr');
      trList.forEach((tr) => {
        const cells: RichTextNode[] = [];
        tr.querySelectorAll('th, td').forEach((cell) => {
          const isHeader = cell.tagName.toUpperCase() === 'TH';
          const inline = parseInlineNodes(cell);
          cells.push({
            type: isHeader ? 'tableHeader' : 'tableCell',
            content: [{ type: 'paragraph', content: inline }],
          });
        });
        rows.push({
          type: 'tableRow',
          content: cells,
        });
      });
      return {
        type: 'table',
        content: rows,
      };
    }

    // Default inline wrapped in paragraph
    const inline = parseInlineNodes(el);
    if (inline.length > 0) {
      return {
        type: 'paragraph',
        content: inline,
      };
    }

    return null;
  }

  for (let i = 0; i < body.childNodes.length; i++) {
    const child = body.childNodes[i];
    if (child) {
      const block = processBlockNode(child);
      if (block) content.push(block);
    }
  }

  if (content.length === 0) {
    return createEmptyRichDocJson();
  }

  return {
    type: 'doc',
    version: 1,
    content,
  };
}

/**
 * Render inline marks to HTML string.
 */
function renderInlineNodeToHtml(node: RichTextNode): string {
  if (node.type === 'hardBreak') return '<br />';
  let text = node.text || '';
  // Escape HTML characters
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (!node.marks || node.marks.length === 0) return text;

  let wrapped = text;
  for (const mark of node.marks) {
    switch (mark.type) {
      case 'bold':
        wrapped = `<b>${wrapped}</b>`;
        break;
      case 'italic':
        wrapped = `<i>${wrapped}</i>`;
        break;
      case 'underline':
        wrapped = `<u>${wrapped}</u>`;
        break;
      case 'strike':
        wrapped = `<s>${wrapped}</s>`;
        break;
      case 'code':
        wrapped = `<code class="bg-muted/80 text-[#ff7a1a] px-1.5 py-0.5 rounded font-mono text-xs border border-border/60">${wrapped}</code>`;
        break;
      case 'link':
        wrapped = `<a href="${mark.attrs?.href || '#'}" target="_blank" rel="noopener noreferrer" class="text-primary underline">${wrapped}</a>`;
        break;
    }
  }
  return wrapped;
}

/**
 * Convert RichDocumentJson (or JSON string) to styled HTML string for editor initialization.
 */
export function richJsonToHtml(docOrJson: RichDocumentJson | string | null | undefined): string {
  if (!docOrJson) return '<p></p>';

  let doc: RichDocumentJson;
  if (typeof docOrJson === 'string') {
    if (!isRichDocumentJsonString(docOrJson)) {
      // Input is already HTML string, return directly
      return docOrJson;
    }
    try {
      doc = JSON.parse(docOrJson);
    } catch {
      return '<p></p>';
    }
  } else {
    doc = docOrJson;
  }

  if (!doc.content || doc.content.length === 0) {
    return '<p></p>';
  }

  function renderBlock(node: RichTextNode): string {
    switch (node.type) {
      case 'heading': {
        const level = node.attrs?.level || 2;
        const inlineHtml = (node.content || []).map(renderInlineNodeToHtml).join('');
        return `<h${level}>${inlineHtml}</h${level}>`;
      }
      case 'paragraph': {
        const inlineHtml = (node.content || []).map(renderInlineNodeToHtml).join('');
        return `<p>${inlineHtml || '<br />'}</p>`;
      }
      case 'bulletList': {
        const itemsHtml = (node.content || [])
          .map((item) => {
            const inner = (item.content || []).map(renderBlock).join('');
            return `<li>${inner}</li>`;
          })
          .join('');
        return `<ul>${itemsHtml}</ul>`;
      }
      case 'orderedList': {
        const itemsHtml = (node.content || [])
          .map((item) => {
            const inner = (item.content || []).map(renderBlock).join('');
            return `<li>${inner}</li>`;
          })
          .join('');
        return `<ol>${itemsHtml}</ol>`;
      }
      case 'codeBlock': {
        const text = (node.content || []).map((c) => c.text || '').join('');
        return `<pre class="bg-muted/50 p-3 rounded-lg font-mono text-xs my-2 overflow-x-auto"><code>${text}</code></pre>`;
      }
      case 'table': {
        const rows = (node.content || []).map((tr) => {
          const cells = (tr.content || [])
            .map((cell) => {
              const isHeader = cell.type === 'tableHeader';
              const cellTag = isHeader ? 'th' : 'td';
              const cls = isHeader
                ? 'border border-border/80 p-2.5 bg-muted/40 text-left font-semibold'
                : 'border border-border/80 p-2.5';
              const inner = (cell.content || []).map(renderBlock).join('');
              return `<${cellTag} class="${cls}">${inner}</${cellTag}>`;
            })
            .join('');
          return `<tr>${cells}</tr>`;
        });
        return `<table class="border-collapse w-full my-3 border border-border/80"><tbody>${rows.join(
          ''
        )}</tbody></table>`;
      }
      default:
        return '';
    }
  }

  return doc.content.map(renderBlock).join('');
}
