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

describe('SCR-CRS-01: Nomination Suite', () => {
  beforeEach(() => {
    setMockPersonaCookie('user');
    setAccessToken('mock-access-token-user');
  });

  it('renders nomination button in course detail and toggles nomination state', async () => {
    const user = userEvent.setup();
    renderAppAt('/courses/course-intro-1');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Đề cử/i })).toBeInTheDocument();
    });

    const nominateBtn = screen.getByRole('button', { name: /Đề cử/i });
    expect(nominateBtn).toBeInTheDocument();

    await user.click(nominateBtn);

    await waitFor(() => {
      expect(screen.getByText('Đã đề cử khóa học!')).toBeInTheDocument();
    });
  });
});
