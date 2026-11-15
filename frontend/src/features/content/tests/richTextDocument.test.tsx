import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  htmlToRichJson,
  richJsonToHtml,
  isRichDocumentJsonString,
  isRichDocEmpty,
  createEmptyRichDocJson,
  type RichDocumentJson,
} from '../lib/richTextDocument';
import { RichTextDocumentRenderer } from '../components/RichTextDocumentRenderer';

describe('RichText Document AST & JSON Serialization', () => {
  it('creates empty rich doc JSON and identifies it as empty', () => {
    const emptyDoc = createEmptyRichDocJson();
    expect(emptyDoc.type).toBe('doc');
    expect(emptyDoc.version).toBe(1);
    expect(isRichDocEmpty(emptyDoc)).toBe(true);
    expect(isRichDocEmpty(JSON.stringify(emptyDoc))).toBe(true);
  });

  it('converts formatted HTML (bold, italic, code, heading, lists, table) into structured JSON', () => {
    const html = `
      <h2>Tiêu đề mục</h2>
      <p>Xin chào <strong>thế giới</strong> và <em>bạn</em> cùng <code class="test">code()</code>.</p>
      <ul>
        <li>Mục A</li>
        <li>Mục B</li>
      </ul>
      <table>
        <thead>
          <tr><th>Cột 1</th><th>Cột 2</th></tr>
        </thead>
        <tbody>
          <tr><td>Dữ liệu 1</td><td>Dữ liệu 2</td></tr>
        </tbody>
      </table>
    `;

    const docJson = htmlToRichJson(html);
    expect(docJson.type).toBe('doc');
    expect(docJson.content.length).toBeGreaterThanOrEqual(4);

    // Verify Heading
    const heading = docJson.content.find((n) => n.type === 'heading');
    expect(heading).toBeDefined();
    expect(heading?.attrs?.level).toBe(2);
    expect(heading?.content?.[0]?.text).toContain('Tiêu đề mục');

    // Verify Paragraph with marks
    const paragraph = docJson.content.find((n) => n.type === 'paragraph');
    expect(paragraph).toBeDefined();
    const boldNode = paragraph?.content?.find((c) => c.marks?.some((m) => m.type === 'bold'));
    expect(boldNode?.text).toBe('thế giới');

    const codeNode = paragraph?.content?.find((c) => c.marks?.some((m) => m.type === 'code'));
    expect(codeNode?.text).toBe('code()');

    // Verify List
    const list = docJson.content.find((n) => n.type === 'bulletList');
    expect(list).toBeDefined();
    expect(list?.content?.length).toBe(2);

    // Verify Table
    const table = docJson.content.find((n) => n.type === 'table');
    expect(table).toBeDefined();
    expect(table?.content?.length).toBeGreaterThanOrEqual(2);
  });

  it('serializes JSON to HTML and back without data loss', () => {
    const originalHtml = '<h2>Chương mới</h2><p>Nội dung <b>quan trọng</b></p>';
    const docJson = htmlToRichJson(originalHtml);
    const jsonString = JSON.stringify(docJson);

    expect(isRichDocumentJsonString(jsonString)).toBe(true);

    const regeneratedHtml = richJsonToHtml(jsonString);
    expect(regeneratedHtml).toContain('<h2>Chương mới</h2>');
    expect(regeneratedHtml).toContain('<b>quan trọng</b>');
  });

  it('RichTextDocumentRenderer renders DOM elements from JSON AST', () => {
    const sampleDoc: RichDocumentJson = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Tiêu đề từ JSON' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Đây là đoạn văn ' },
            { type: 'text', text: 'in đậm', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' và ' },
            { type: 'text', text: 'mã lệnh', marks: [{ type: 'code' }] },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Danh sách mục 1' }],
                },
              ],
            },
          ],
        },
      ],
    };

    render(<RichTextDocumentRenderer doc={sampleDoc} />);

    // Verify semantic DOM elements rendered
    expect(screen.getByRole('heading', { level: 2, name: 'Tiêu đề từ JSON' })).toBeInTheDocument();
    expect(screen.getByText('in đậm')).toBeInTheDocument();
    expect(screen.getByText('in đậm').tagName.toLowerCase()).toBe('strong');
    expect(screen.getByText('mã lệnh').tagName.toLowerCase()).toBe('code');
    expect(screen.getByText('Danh sách mục 1')).toBeInTheDocument();
  });

  it('RichTextDocumentRenderer handles JSON string input and legacy HTML input', () => {
    const jsonStr = JSON.stringify({
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Văn bản từ chuỗi JSON' }],
        },
      ],
    });

    const { rerender } = render(<RichTextDocumentRenderer doc={jsonStr} />);
    expect(screen.getByText('Văn bản từ chuỗi JSON')).toBeInTheDocument();

    // Legacy HTML string input
    rerender(<RichTextDocumentRenderer doc="<p>Văn bản legacy HTML</p>" />);
    expect(screen.getByText('Văn bản legacy HTML')).toBeInTheDocument();
  });

  it('correctly parses tables wrapped inside container divs without losing table structure', () => {
    const htmlWithWrapperDiv = `
      <div>
        <table class="border-collapse w-full my-3 border border-border/80">
          <thead>
            <tr class="bg-muted/40">
              <th class="border border-border/80 p-2.5 text-left font-semibold">Cột A</th>
              <th class="border border-border/80 p-2.5 text-left font-semibold">Cột B</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-border/80 p-2.5">Giá trị 1</td>
              <td class="border border-border/80 p-2.5">Giá trị 2</td>
            </tr>
          </tbody>
        </table>
        <p></p>
      </div>
    `;

    const docJson = htmlToRichJson(htmlWithWrapperDiv);
    const tableNode = docJson.content.find((n) => n.type === 'table');
    expect(tableNode).toBeDefined();
    expect(tableNode?.content?.length).toBe(2);

    // Verify round-trip preserves table structure with thead, tbody, th, and td
    const htmlOutput = richJsonToHtml(docJson);
    expect(htmlOutput).toContain('<thead>');
    expect(htmlOutput).toContain('<tbody>');
    expect(htmlOutput).toContain('<th class="border border-border/80 p-2.5 bg-muted/40 text-left font-semibold">Cột A</th>');
    expect(htmlOutput).toContain('<td class="border border-border/80 p-2.5">Giá trị 1</td>');
  });

  it('RichTextDocumentRenderer renders tables with proper semantic headers, borders, and cells', () => {
    const tableDoc: RichDocumentJson = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableHeader',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mã số' }] }],
                },
                {
                  type: 'tableHeader',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tên bài giảng' }] }],
                },
              ],
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'BM-01' }] }],
                },
                {
                  type: 'tableCell',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Giới thiệu' }] }],
                },
              ],
            },
          ],
        },
      ],
    };

    render(<RichTextDocumentRenderer doc={tableDoc} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Mã số' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Tên bài giảng' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'BM-01' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Giới thiệu' })).toBeInTheDocument();
  });
});
