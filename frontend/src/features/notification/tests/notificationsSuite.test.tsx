import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { setAccessToken } from '@/shared/api';
import '@/shared/i18n';
import { AppProviders } from '@/app/providers';
import { createAppQueryClient } from '@/app/queryClient';
import { appRoutes } from '@/app/router';
import { setMockPersonaCookie } from '../../../../mocks/handlers';

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

describe('SCR-NTF-01: Notification Suite', () => {
  beforeEach(() => {
    setMockPersonaCookie('user');
    setAccessToken('mock-access-token-user');
  });

  it('renders notifications list with tabs and header', async () => {
    renderAppAt('/notifications');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Thông báo/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /^Tất cả$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Chưa đọc$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đánh dấu tất cả đã đọc/i })).toBeInTheDocument();

    await waitFor(() => {
      const items = screen.getAllByTestId('notification-item');
      expect(items.length).toBeGreaterThan(0);
    });
  });

  it('allows filtering by unread notifications', async () => {
    const user = userEvent.setup();
    renderAppAt('/notifications');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Chưa đọc$/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^Chưa đọc$/i }));

    await waitFor(() => {
      const items = screen.getAllByTestId('notification-item');
      expect(items.length).toBeGreaterThan(0);
    });
  });

  it('allows marking single notification as read', async () => {
    const user = userEvent.setup();
    renderAppAt('/notifications');

    await waitFor(() => {
      const markButtons = screen.getAllByRole('button', { name: /Đánh dấu đã đọc/i });
      expect(markButtons.length).toBeGreaterThan(0);
    });

    const firstMarkButton = screen.getAllByRole('button', { name: /Đánh dấu đã đọc/i })[0]!;
    await user.click(firstMarkButton);
  });

  it('allows marking all notifications as read', async () => {
    const user = userEvent.setup();
    renderAppAt('/notifications');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Đánh dấu tất cả đã đọc/i })).toBeInTheDocument();
    });

    const markAllBtn = screen.getByRole('button', { name: /Đánh dấu tất cả đã đọc/i });
    await user.click(markAllBtn);
  });

  it('allows deleting a notification', async () => {
    const user = userEvent.setup();
    renderAppAt('/notifications');

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /Xóa thông báo/i });
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    const firstDeleteBtn = screen.getAllByRole('button', { name: /Xóa thông báo/i })[0]!;
    await user.click(firstDeleteBtn);
  });
});
