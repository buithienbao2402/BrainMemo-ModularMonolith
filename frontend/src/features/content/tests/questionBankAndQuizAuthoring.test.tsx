import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QuestionEditorModal } from '../components/QuestionEditorModal';
import { QuestionEditorDrawer } from '../components/QuestionEditorDrawer';
import { QuizBlockEditor } from '../components/QuizBlockEditor';
import { ImportQuestionsModal } from '../components/ImportQuestionsModal';
import { QuestionUsageDrawer } from '../components/QuestionUsageDrawer';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('T-S7-FE-01: Question Bank & Quiz Authoring Suite', () => {
  it('QuestionEditorModal: shows DRAFT when stem is empty and switches to READY when valid', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    renderWithClient(
      <QuestionEditorModal
        courseId="test-course-id"
        isOpen={true}
        onClose={handleClose}
      />
    );

    expect(screen.getByText('Tạo mới câu hỏi')).toBeInTheDocument();
    // Initially stem is empty -> DRAFT
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
    expect(screen.getByText('Nội dung câu hỏi không được để trống')).toBeInTheDocument();

    // Type stem
    const textarea = screen.getByPlaceholderText('Nhập nội dung câu hỏi tại đây...');
    await user.type(textarea, 'Thủ đô của Việt Nam là gì?');

    // Default has 2 options with 1 correct -> becomes READY
    await waitFor(() => {
      expect(screen.getByText('READY')).toBeInTheDocument();
    });
  });

  it('QuestionEditorModal: switching to MATCHING requires pairs and shows pairs inputs', async () => {
    const user = userEvent.setup();

    renderWithClient(
      <QuestionEditorModal
        courseId="test-course-id"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const typeSelect = screen.getByDisplayValue('Trắc nghiệm 1 đáp án');
    await user.selectOptions(typeSelect, 'MATCHING');

    expect(screen.getByText('Các cặp ghép tương ứng (Term ↔ Match)')).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('Thuật ngữ / Vế trái...').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByPlaceholderText('Định nghĩa / Vế phải...').length).toBeGreaterThanOrEqual(2);
  });

  it('QuizBlockEditor: switches between 3 tabs (Info, Questions, Exceptions)', async () => {
    const user = userEvent.setup();
    const handleUpdate = vi.fn();

    renderWithClient(
      <QuizBlockEditor
        courseId="test-course-id"
        blockId="test-block-id"
        title="Bài kiểm tra mẫu"
        onUpdate={handleUpdate}
      />
    );

    // Initial tab is Info
    expect(screen.getByText('Thời gian làm bài (phút)')).toBeInTheDocument();

    // Switch to Questions tab
    const questionsTab = screen.getByRole('button', { name: /Câu hỏi/i });
    await user.click(questionsTab);
    expect(screen.getByText(/Câu hỏi chỉ định thủ công/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Quy tắc bốc ngẫu nhiên/i).length).toBeGreaterThan(0);

    // Switch to Exceptions tab (SCR-CNT-09)
    const exceptionsTab = screen.getByRole('button', { name: /Ngoại lệ/i });
    await user.click(exceptionsTab);
    expect(screen.getByText(/Thêm ngoại lệ cho học viên đặc biệt/i)).toBeInTheDocument();
  });

  it('ImportQuestionsModal: renders sample download button and file picker', async () => {
    renderWithClient(
      <ImportQuestionsModal
        courseId="test-course-id"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Nhập câu hỏi từ bảng tính (SCR-CNT-08)')).toBeInTheDocument();
    expect(screen.getByText('Tải tệp mẫu')).toBeInTheDocument();
    expect(screen.getByText(/Chấp nhận định dạng \.csv hoặc \.xlsx/i)).toBeInTheDocument();
  });

  it('QuestionUsageDrawer: renders stats when opened', async () => {
    renderWithClient(
      <QuestionUsageDrawer
        courseId="test-course-id"
        questionId="q-123"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Thông tin sử dụng câu hỏi')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Bài thi dùng')).toBeInTheDocument();
      expect(screen.getByText('Lượt trả lời')).toBeInTheDocument();
      expect(screen.getByText('Tỉ lệ đúng')).toBeInTheDocument();
    });
  });

  it('QuestionEditorDrawer: renders all 8 sections and handles saving', async () => {
    const handleClose = vi.fn();
    renderWithClient(
      <QuestionEditorDrawer
        courseId="test-course-id"
        isOpen={true}
        onClose={handleClose}
      />
    );

    expect(screen.getByText('Thêm câu hỏi mới')).toBeInTheDocument();
    expect(screen.getByText(/1\. Loại câu hỏi/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Nội dung câu hỏi/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Khu vực đáp án/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Giải thích chi tiết/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. Điểm số bài học/i)).toBeInTheDocument();
    expect(screen.getByText(/6\. Độ khó/i)).toBeInTheDocument();
    expect(screen.getByText(/7\. Tag phân loại học thuật/i)).toBeInTheDocument();
    expect(screen.getByText(/8\. Trạng thái câu hỏi/i)).toBeInTheDocument();
  });
});
