import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from '@/shared/ui/Toast';
import {
  OutcomesManagementPage,
  OutcomeMappingMatrixPage,
  AssessmentStatsPage,
  CourseReviewsManagePage,
  LearnerGradebookPage,
} from '../index';

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
      <ToastProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          {ui}
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe('T-S9-FE-01: CLO/PLO, Analytics & Reviews Suite Tests', () => {
  it('OutcomesManagementPage: renders CLO and PLO lists with create buttons', async () => {
    renderWithClient(
      <Routes>
        <Route path="/courses/:courseId/manage/outcomes" element={<OutcomesManagementPage />} />
      </Routes>,
      '/courses/course-1/manage/outcomes'
    );

    expect(screen.getByText('Chuẩn đầu ra học phần (CLO & PLO)')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('CLO1')).toBeInTheDocument();
      expect(screen.getByText('CLO2')).toBeInTheDocument();
      expect(screen.getAllByText('PLO1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('PLO2').length).toBeGreaterThan(0);
    });

    expect(screen.getByRole('button', { name: /Thêm CLO mới/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thêm PLO/i })).toBeInTheDocument();
  });

  it('OutcomeMappingMatrixPage: renders 2D matrix between blocks and CLOs', async () => {
    renderWithClient(
      <Routes>
        <Route
          path="/courses/:courseId/manage/outcomes/mapping"
          element={<OutcomeMappingMatrixPage />}
        />
      </Routes>,
      '/courses/course-1/manage/outcomes/mapping'
    );

    expect(screen.getByText(/Ma trận bài đánh giá và Chuẩn đầu ra/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Kiểm tra trắc nghiệm & tự luận Chương 1')).toBeInTheDocument();
      expect(screen.getByText('Bài tập lớn: Thiết kế CSDL')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Lưu ma trận/i })).toBeInTheDocument();
  });

  it('AssessmentStatsPage: renders histogram distribution and CLO pass rates', async () => {
    renderWithClient(
      <Routes>
        <Route path="/courses/:courseId/manage/stats" element={<AssessmentStatsPage />} />
      </Routes>,
      '/courses/course-1/manage/stats'
    );

    await waitFor(() => {
      expect(screen.getByText('Thống kê kết quả đánh giá khóa học')).toBeInTheDocument();
      expect(screen.getAllByText(/Phổ điểm học viên/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Mức độ đạt từng Chuẩn đầu ra/i)).toBeInTheDocument();
      expect(screen.getByText(/Phân tích câu hỏi hay làm sai nhất/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Xuất bảng điểm \(CSV\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xuất CLO \(CSV\)/i })).toBeInTheDocument();
  });

  it('CourseReviewsManagePage: renders reviews list, summary, and reply button', async () => {
    renderWithClient(
      <Routes>
        <Route path="/courses/:courseId/manage/reviews" element={<CourseReviewsManagePage />} />
      </Routes>,
      '/courses/course-1/manage/reviews'
    );

    expect(screen.getByText('Quản lý đánh giá và nhận xét khóa học')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Trần Văn An')).toBeInTheDocument();
      expect(screen.getByText('Khóa học rất hay và bám sát thực tế!')).toBeInTheDocument();
      expect(screen.getByText('Lê Thị Bình')).toBeInTheDocument();
    });

    expect(screen.getByText(/Phản hồi học viên/i)).toBeInTheDocument();
  });

  it('LearnerGradebookPage: renders CLO achievements section', async () => {
    renderWithClient(
      <Routes>
        <Route path="/courses/:courseId/gradebook" element={<LearnerGradebookPage />} />
      </Routes>,
      '/courses/course-1/gradebook'
    );

    await waitFor(() => {
      expect(screen.getByText('Kết quả học tập & Sổ điểm của bạn')).toBeInTheDocument();
      expect(screen.getByText('8.85')).toBeInTheDocument();
    });
  });
});
