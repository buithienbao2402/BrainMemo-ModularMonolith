import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import {
  GradingQueuePage,
  ManualGradingPage,
  CourseGradebookPage,
  LearnerGradebookPage,
  AssessmentConfigPage,
} from '../index';
import { AssignmentPlayerPage } from '@/features/learning';

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

describe('T-S8-FE-01: Grading Suite & Gradebook Tests', () => {
  it('GradingQueuePage: renders items waiting for grading with filter tabs', async () => {
    renderWithClient(
      <Routes>
        <Route path="/courses/:courseId/manage/grading" element={<GradingQueuePage />} />
      </Routes>,
      '/courses/course-1/manage/grading'
    );

    expect(screen.getByText('Hàng đợi chấm điểm')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Kiểm tra trắc nghiệm & tự luận Chương 1')).toBeInTheDocument();
      expect(screen.getByText('Bài tập lớn: Thiết kế CSDL')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Chấm bài').length).toBeGreaterThan(0);
  });

  it('ManualGradingPage: renders assignment submission review and grading input', async () => {
    renderWithClient(
      <Routes>
        <Route
          path="/courses/:courseId/manage/grading/:kind/:id"
          element={<ManualGradingPage />}
        />
      </Routes>,
      '/courses/course-1/manage/grading/ASSIGNMENT/sub-assignment-demo-1'
    );

    await waitFor(() => {
      expect(screen.getByText('Chấm điểm bài tập nộp file')).toBeInTheDocument();
      expect(screen.getByText(/ERD_Database_Diagram.pdf/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Điểm số (Thang điểm 100)')).toBeInTheDocument();
    expect(screen.getByText('Xác nhận chấm điểm')).toBeInTheDocument();
  });

  it('LearnerGradebookPage: renders learner summary stats and component scores', async () => {
    renderWithClient(
      <Routes>
        <Route path="/courses/:courseId/gradebook" element={<LearnerGradebookPage />} />
      </Routes>,
      '/courses/course-1/gradebook'
    );

    await waitFor(() => {
      expect(screen.getByText('Kết quả học tập & Sổ điểm của bạn')).toBeInTheDocument();
      expect(screen.getByText('8.85')).toBeInTheDocument();
      expect(screen.getByText('GIOI')).toBeInTheDocument();
      expect(screen.getByText('ĐẠT KHÓA HỌC')).toBeInTheDocument();
    });

    expect(screen.getByText('Kiểm tra trắc nghiệm & tự luận Chương 1')).toBeInTheDocument();
    expect(screen.getByText('Bài tập lớn: Thiết kế CSDL')).toBeInTheDocument();
  });

  it('CourseGradebookPage: renders full student table and components', async () => {
    renderWithClient(
      <Routes>
        <Route path="/courses/:courseId/manage/gradebook" element={<CourseGradebookPage />} />
      </Routes>,
      '/courses/course-1/manage/gradebook'
    );

    await waitFor(() => {
      expect(screen.getByText('Sổ điểm khóa học')).toBeInTheDocument();
      expect(screen.getByText('Quang Trần')).toBeInTheDocument();
      expect(screen.getByText('Xuất CSV')).toBeInTheDocument();
    });
  });

  it('AssessmentConfigPage: renders evaluation rules and weights table', async () => {
    renderWithClient(
      <Routes>
        <Route path="/courses/:courseId/manage/assessment" element={<AssessmentConfigPage />} />
      </Routes>,
      '/courses/course-1/manage/assessment'
    );

    await waitFor(() => {
      expect(screen.getByText(/Cấu hình đánh giá & Quy tắc tính điểm/i)).toBeInTheDocument();
      expect(screen.getByText('Điểm cao nhất')).toBeInTheDocument();
      expect(screen.getByText('Lần nộp gần nhất')).toBeInTheDocument();
      expect(screen.getByText('Trung bình các lần')).toBeInTheDocument();
    });

    expect(screen.getByText('Phân bổ trọng số điểm thành phần')).toBeInTheDocument();
  });

  it('AssignmentPlayerPage: renders student assignment submission player', async () => {
    renderWithClient(
      <Routes>
        <Route path="/courses/:courseId/assignments/:blockId" element={<AssignmentPlayerPage />} />
      </Routes>,
      '/courses/course-1/assignments/assignment-block-1'
    );

    await waitFor(() => {
      expect(screen.getByText('Nộp bài tập')).toBeInTheDocument();
      expect(screen.getByText('Lưu nháp')).toBeInTheDocument();
    });
  });
});
