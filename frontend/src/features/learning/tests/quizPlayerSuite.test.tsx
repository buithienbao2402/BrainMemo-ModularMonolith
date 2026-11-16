import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QuizBlockCard } from '../components/QuizBlockCard';
import { QuizPlayerPage } from '../pages/QuizPlayerPage';
import { QuizResultPage } from '../pages/QuizResultPage';

function renderWithClient(ui: React.ReactElement, initialRoute: string = '/') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('T-S7-FE-02: Quiz Player Suite (SCR-LRN-02, 03, 04)', () => {
  it('QuizBlockCard: renders time limit, attempts history and start button', async () => {
    renderWithClient(
      <QuizBlockCard
        courseId="sample-course-1"
        blockId="block-quiz-1"
        title="Kiểm tra kiến thức chương 1"
        timeLimitMinutes={45}
        maxAttempts={3}
        passScorePercent={70}
      />
    );

    expect(screen.getByText('Kiểm tra kiến thức chương 1')).toBeInTheDocument();
    expect(screen.getByText('45 phút')).toBeInTheDocument();
    expect(screen.getByText('70% điểm')).toBeInTheDocument();

    // Attempts history from mock handler
    await waitFor(() => {
      expect(screen.getByText('Lịch sử làm bài (1)')).toBeInTheDocument();
    });
    expect(screen.getByText(/8.5 \/ 10.0/i)).toBeInTheDocument();
    expect(screen.getByText('Làm lại bài thi (Lần 2)')).toBeInTheDocument();
  });

  it('QuizBlockCard: opens password prompt when hasPassword is true', async () => {
    const user = userEvent.setup();
    renderWithClient(
      <QuizBlockCard
        courseId="sample-course-1"
        blockId="block-quiz-1"
        title="Bài thi bảo vệ mật khẩu"
        hasPassword={true}
      />
    );

    const startBtn = await screen.findByRole('button', { name: /Làm lại bài thi/i });
    await user.click(startBtn);

    expect(screen.getByText('Mật khẩu bài kiểm tra')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập mật khẩu bài thi...')).toBeInTheDocument();
  });

  it('QuizPlayerPage: renders countdown timer, question navigation, answers and incomplete warning', async () => {
    const user = userEvent.setup();

    renderWithClient(
      <Routes>
        <Route path="/courses/:courseId/quiz-attempts/:attemptId" element={<QuizPlayerPage />} />
      </Routes>,
      '/courses/sample-course-1/quiz-attempts/att-in-progress-1'
    );

    // Question stem
    await waitFor(() => {
      expect(screen.getByText('Thủ đô của Việt Nam là gì?')).toBeInTheDocument();
    });
    expect(screen.getByText('Câu 1')).toBeInTheDocument();
    expect(screen.getByText(/5 điểm/i)).toBeInTheDocument();

    // Select option A (Hà Nội)
    const optionHanoi = screen.getByText('Hà Nội');
    await user.click(optionHanoi);

    // Flag question
    const flagBtn = screen.getByRole('button', { name: /Gắn cờ xem lại/i });
    await user.click(flagBtn);
    expect(screen.getByRole('button', { name: /Đã gắn cờ/i })).toBeInTheDocument();

    // Next question (Câu sau)
    const nextBtn = screen.getByRole('button', { name: /Câu sau/i });
    await user.click(nextBtn);

    expect(screen.getByText('HTML là một ngôn ngữ lập trình.')).toBeInTheDocument();
    expect(screen.getByText('Câu 2')).toBeInTheDocument();

    // Click submit button while Câu 2 is unanswered -> shows incomplete warning modal
    const submitBtn = screen.getByRole('button', { name: /Nộp bài thi/i });
    await user.click(submitBtn);

    expect(screen.getByText('Cảnh báo: Còn câu hỏi chưa trả lời')).toBeInTheDocument();
    expect(screen.getByText(/Bạn còn/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vẫn muốn nộp bài/i })).toBeInTheDocument();
  });

  it('QuizResultPage: renders score, pass banner, and detailed review', async () => {
    renderWithClient(
      <Routes>
        <Route path="/courses/:courseId/quiz-attempts/:attemptId/result" element={<QuizResultPage />} />
      </Routes>,
      '/courses/sample-course-1/quiz-attempts/att-result-1/result'
    );

    await waitFor(() => {
      expect(screen.getByText('Chúc mừng! Bạn đã ĐẠT')).toBeInTheDocument();
    });
    expect(screen.getByText('10.0')).toBeInTheDocument();
    expect(screen.getByText(/\/ 10.0 điểm \(100%\)/i)).toBeInTheDocument();

    // Detailed question review
    expect(screen.getByText('Chi tiết câu hỏi & Lời giải (2)')).toBeInTheDocument();
    expect(screen.getByText('Thủ đô của Việt Nam là gì?')).toBeInTheDocument();
    expect(screen.getByText(/Hà Nội là thủ đô của nước CHXHCN Việt Nam/i)).toBeInTheDocument();
  });
});
