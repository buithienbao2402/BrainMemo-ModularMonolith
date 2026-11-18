import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from '@/shared/ui/Toast';
import {
  OutcomesManagementPage,
  OutcomeMappingMatrixPage,
  AssessmentRulesPage,
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

describe('T-S9-FE-01: CLO, Matrix, Rules, Analytics & Reviews Suite Tests', () => {
  it('OutcomesManagementPage: renders Bloom levels and CLO list with create button (no PLO)', async () => {
    renderWithClient(
      <Routes>
        <Route path="/courses/:courseId/manage/outcomes" element={<OutcomesManagementPage />} />
      </Routes>,
      '/courses/course-1/manage/outcomes'
    );

    await waitFor(() => {
      expect(screen.getByText('Thang mức Bloom áp dụng')).toBeInTheDocument();
      expect(screen.getByText('Danh sách CLO của khóa học')).toBeInTheDocument();
      expect(screen.getByText('CLO1')).toBeInTheDocument();
      expect(screen.getByText('CLO2')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Thêm CLO/i })).toBeInTheDocument();
    // Confirms PLO is not in the headings or tabs
    expect(screen.queryByText('Chuẩn đầu ra học phần (CLO & PLO)')).not.toBeInTheDocument();
    expect(screen.queryByText(/Thêm PLO/i)).not.toBeInTheDocument();
  });

  it('OutcomeMappingMatrixPage: renders 2D matrix, summary cards, and save button', async () => {
    renderWithClient(
      <Routes>
        <Route
          path="/courses/:courseId/manage/outcomes/mapping"
          element={<OutcomeMappingMatrixPage />}
        />
      </Routes>,
      '/courses/course-1/manage/outcomes/mapping'
    );

    await waitFor(() => {
      expect(screen.getByText('Tổng số bài đánh giá')).toBeInTheDocument();
      expect(screen.getByText('Chuẩn đầu ra đã phủ')).toBeInTheDocument();
      expect(screen.getByText('Trạng thái cân bằng')).toBeInTheDocument();
      expect(screen.getByText('1. Kiểm tra trắc nghiệm & tự luận Chương 1')).toBeInTheDocument();
      expect(screen.getByText('2. Bài tập lớn: Thiết kế CSDL')).toBeInTheDocument();
      expect(screen.getByText('Tổng trọng số tích lũy CLO')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Lưu ma trận/i })).toBeInTheDocument();
  });

  it('AssessmentRulesPage: renders grading rules, grade scale, and achievement levels', async () => {
    renderWithClient(
      <Routes>
        <Route
          path="/courses/:courseId/manage/outcomes/rules"
          element={<AssessmentRulesPage />}
        />
      </Routes>,
      '/courses/course-1/manage/outcomes/rules'
    );

    await waitFor(() => {
      expect(screen.getByText('Quy tắc điểm tổng kết')).toBeInTheDocument();
      expect(screen.getByText('Xếp loại học lực')).toBeInTheDocument();
      expect(screen.getByText('Mức đạt CLO')).toBeInTheDocument();
      expect(screen.getByText('Hệ 5 mức MOET')).toBeInTheDocument();
      expect(screen.getByText('Xuất sắc (Advanced Mastery)')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Lưu cấu hình quy tắc/i })).toBeInTheDocument();
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
