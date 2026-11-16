import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { setAccessToken } from '@/shared/api';
import '@/shared/i18n';
import { AppProviders } from '@/app/providers';
import { createAppQueryClient } from '@/app/queryClient';
import { appRoutes } from '@/app/router';
import { setMockPersonaCookie, resetMockCourses } from '../../../../mocks/handlers';

function renderAppAt(initialPath: string) {
  const queryClient = createAppQueryClient({ disableRetry: true });
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [initialPath],
  });

  return render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  );
}

describe('SCR-LRN-06: Comments Suite', () => {
  beforeEach(() => {
    resetMockCourses();
    setMockPersonaCookie('user');
    setAccessToken('mock-access-token-user');
  });

  it('renders comments section in learning player with pinned badge and replies', async () => {
    renderAppAt('/courses/my-course-1/learn');

    await waitFor(() => {
      expect(screen.getByText(/Hỏi đáp & Thảo luận/i)).toBeInTheDocument();
    });

    expect(
      screen.getByPlaceholderText(/Đặt câu hỏi hoặc chia sẻ ý kiến của bạn về bài học/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gửi bình luận/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Đã ghim bởi Giảng viên')).toBeInTheDocument();
      expect(screen.getByText('Khóa học này giải thích rất dễ hiểu và chi tiết!')).toBeInTheDocument();
      expect(screen.getByText('Giảng viên Quang Trần')).toBeInTheDocument();
      expect(screen.getByText('Cảm ơn Tuấn nhé! Chúc bạn học tốt!')).toBeInTheDocument();
    });
  });

  it('allows submitting a new root comment', async () => {
    const user = userEvent.setup();
    renderAppAt('/courses/my-course-1/learn');

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Đặt câu hỏi hoặc chia sẻ ý kiến của bạn về bài học/i)
      ).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(
      /Đặt câu hỏi hoặc chia sẻ ý kiến của bạn về bài học/i
    );
    await user.type(textarea, 'Bài học rất hay, cảm ơn thầy nhiều ạ!');

    const submitBtn = screen.getByRole('button', { name: /Gửi bình luận/i });
    expect(submitBtn).not.toBeDisabled();
    await user.click(submitBtn);

    await waitFor(() => {
      expect(textarea).toHaveValue('');
    });
  });

  it('allows opening reply composer and submitting a reply', async () => {
    const user = userEvent.setup();
    renderAppAt('/courses/my-course-1/learn');

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /^Trả lời$/i }).length).toBeGreaterThan(0);
    });

    const replyBtn = screen.getAllByRole('button', { name: /^Trả lời$/i })[0]!;
    await user.click(replyBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Trả lời @Lê Minh Tuấn/i)).toBeInTheDocument();
    });

    const replyInput = screen.getByPlaceholderText(/Trả lời @Lê Minh Tuấn/i);
    await user.type(replyInput, 'Mình cũng thấy vậy nè!');

    const sendReplyBtn = screen.getByRole('button', { name: /Gửi trả lời/i });
    await user.click(sendReplyBtn);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/Trả lời @Lê Minh Tuấn/i)).not.toBeInTheDocument();
    });
  });
});
