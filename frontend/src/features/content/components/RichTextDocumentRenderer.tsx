import React from 'react';
import {
  type RichDocumentJson,
  type RichTextNode,
  htmlToRichJson,
  isRichDocumentJsonString,
} from '../lib/richTextDocument';

interface RichTextDocumentRendererProps {
  doc: RichDocumentJson | string | null | undefined;
  className?: string;
}

export function RichTextDocumentRenderer({ doc, className }: RichTextDocumentRendererProps) {
  if (!doc) {
    return <p className="text-muted-foreground/40 italic">Nội dung trống</p>;
  }

  let parsedDoc: RichDocumentJson;
  if (typeof doc === 'string') {
    if (isRichDocumentJsonString(doc)) {
      try {
        parsedDoc = JSON.parse(doc);
      } catch {
        parsedDoc = htmlToRichJson(doc);
      }
    } else {
      // Legacy HTML string support: parse into AST
      parsedDoc = htmlToRichJson(doc);
    }
  } else {
    parsedDoc = doc;
  }

  if (!parsedDoc.content || parsedDoc.content.length === 0) {
    return <p className="text-muted-foreground/40 italic">Nội dung trống</p>;
  }

  // Render inline nodes with marks
  const renderInline = (node: RichTextNode, key: number | string): React.ReactNode => {
    if (node.type === 'hardBreak') {
      return <br key={key} />;
    }

    const text = node.text || '';
    if (!node.marks || node.marks.length === 0) {
      return <React.Fragment key={key}>{text}</React.Fragment>;
    }

    let element: React.ReactNode = text;
    for (let i = 0; i < node.marks.length; i++) {
      const mark = node.marks[i];
      if (!mark) continue;
      const markKey = `${key}-m-${i}`;
      switch (mark.type) {
        case 'bold':
          element = <strong key={markKey} className="font-bold">{element}</strong>;
          break;
        case 'italic':
          element = <em key={markKey} className="italic">{element}</em>;
          break;
        case 'underline':
          element = <u key={markKey} className="underline">{element}</u>;
          break;
        case 'strike':
          element = <s key={markKey} className="line-through">{element}</s>;
          break;
        case 'code':
          element = (
            <code
              key={markKey}
              className="bg-muted/80 text-[#ff7a1a] px-1.5 py-0.5 rounded font-mono text-xs border border-border/60"
            >
              {element}
            </code>
          );
          break;
        case 'link':
          element = (
            <a
              key={markKey}
              href={mark.attrs?.href || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary/80 transition-colors"
            >
              {element}
            </a>
          );
          break;
      }
    }

    return <React.Fragment key={key}>{element}</React.Fragment>;
  };

  // Render block nodes
  const renderBlock = (node: RichTextNode, key: number | string): React.ReactNode => {
    switch (node.type) {
      case 'heading': {
        const level = node.attrs?.level || 2;
        const inlineElements = (node.content || []).map((child, i) => renderInline(child, i));
        switch (level) {
          case 1:
            return (
              <h1 key={key} className="text-2xl font-bold font-serif my-2.5 text-foreground">
                {inlineElements}
              </h1>
            );
          case 2:
            return (
              <h2 key={key} className="text-xl font-bold font-serif my-2 text-foreground">
                {inlineElements}
              </h2>
            );
          case 3:
            return (
              <h3 key={key} className="text-lg font-semibold my-1.5 text-foreground">
                {inlineElements}
              </h3>
            );
          case 4:
            return (
              <h4 key={key} className="text-base font-semibold my-1 text-foreground">
                {inlineElements}
              </h4>
            );
          case 5:
            return (
              <h5 key={key} className="text-sm font-semibold my-0.5 text-foreground">
                {inlineElements}
              </h5>
            );
          case 6:
            return (
              <h6 key={key} className="text-xs font-semibold text-muted-foreground my-0.5">
                {inlineElements}
              </h6>
            );
          default:
            return (
              <h2 key={key} className="text-xl font-bold font-serif my-2 text-foreground">
                {inlineElements}
              </h2>
            );
        }
      }

      case 'paragraph': {
        const inlineElements = (node.content || []).map((child, i) => renderInline(child, i));
        return (
          <p key={key} className="text-sm sm:text-base leading-relaxed text-foreground/90 my-1">
            {inlineElements.length > 0 ? inlineElements : <br />}
          </p>
        );
      }

      case 'bulletList': {
        return (
          <ul key={key} className="list-disc pl-6 space-y-1 my-2 text-sm sm:text-base text-foreground/90">
            {(node.content || []).map((item, i) => (
              <li key={i} className="my-0.5">
                {(item.content || []).map((p, pi) => renderBlock(p, `${i}-${pi}`))}
              </li>
            ))}
          </ul>
        );
      }

      case 'orderedList': {
        return (
          <ol key={key} className="list-decimal pl-6 space-y-1 my-2 text-sm sm:text-base text-foreground/90">
            {(node.content || []).map((item, i) => (
              <li key={i} className="my-0.5">
                {(item.content || []).map((p, pi) => renderBlock(p, `${i}-${pi}`))}
              </li>
            ))}
          </ol>
        );
      }

      case 'codeBlock': {
        const text = (node.content || []).map((c) => c.text || '').join('');
        return (
          <pre
            key={key}
            className="bg-muted/60 p-3.5 rounded-xl font-mono text-xs my-2 overflow-x-auto border border-border/80 text-foreground"
          >
            <code>{text}</code>
          </pre>
        );
      }

      case 'table': {
        const headerRows: RichTextNode[] = [];
        const bodyRows: RichTextNode[] = [];
        (node.content || []).forEach((row) => {
          const hasHeader = (row.content || []).some((cell) => cell.type === 'tableHeader');
          if (hasHeader) {
            headerRows.push(row);
          } else {
            bodyRows.push(row);
          }
        });

        const renderCellContent = (cell: RichTextNode, prefix: string) => {
          const paragraphs = cell.content || [];
          if (paragraphs.length === 0) return null;
          return paragraphs.map((p, pi) => (
            <div key={`${prefix}-p-${pi}`} className="leading-normal">
              {(p.content || []).map((inline, ii) => renderInline(inline, `${prefix}-${pi}-${ii}`))}
            </div>
          ));
        };

        return (
          <div key={key} className="overflow-x-auto my-3">
            <table className="border-collapse w-full border border-border/80 text-sm">
              {headerRows.length > 0 && (
                <thead>
                  {headerRows.map((row, ri) => (
                    <tr key={`h-${ri}`} className="bg-muted/40">
                      {(row.content || []).map((cell, ci) => (
                        <th
                          key={ci}
                          className="border border-border/80 p-2.5 bg-muted/40 text-left font-semibold text-foreground"
                        >
                          {renderCellContent(cell, `h-${ri}-${ci}`)}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
              )}
              <tbody>
                {(bodyRows.length > 0 ? bodyRows : headerRows.length === 0 ? node.content || [] : []).map(
                  (row, ri) => (
                    <tr key={`b-${ri}`}>
                      {(row.content || []).map((cell, ci) => {
                        const isHeader = cell.type === 'tableHeader';
                        const Tag = isHeader ? 'th' : 'td';
                        const cellClasses = isHeader
                          ? 'border border-border/80 p-2.5 bg-muted/40 text-left font-semibold text-foreground'
                          : 'border border-border/80 p-2.5 text-foreground/90';
                        return (
                          <Tag key={ci} className={cellClasses}>
                            {renderCellContent(cell, `b-${ri}-${ci}`)}
                          </Tag>
                        );
                      })}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className={`space-y-1 ${className || ''}`} data-testid="rich-text-document-renderer">
      {parsedDoc.content.map((block, index) => renderBlock(block, index))}
    </div>
  );
}
