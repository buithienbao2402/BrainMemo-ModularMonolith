import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/shared/api';
import '@/shared/i18n';
import { AppProviders } from '@/app/providers';
import { createAppQueryClient } from '@/app/queryClient';
import { appRoutes } from '@/app/router';
import { setMockPersonaCookie } from '../../../../mocks/handlers';
import { ReportModal } from '../components/ReportModal';

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

afterEach(() => {
  clearAccessToken();
  document.cookie = 'bm_mock_persona=; max-age=0; path=/';
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('S10 Moderation & Admin Portal (SCR-MOD-01..06 + SCR-ADM-01, 02)', () => {
  describe('SCR-MOD-01: Report Modal', () => {
    it('renders report modal with reason selection and inputs', async () => {
      setMockPersonaCookie('user');
      setAccessToken('mock-access-token-user');

      const queryClient = createAppQueryClient({ disableRetry: true });
      render(
        <AppProviders queryClient={queryClient}>
          <ReportModal
            isOpen={true}
            onClose={() => {}}
            targetType="COURSE"
            targetId="crs-test-1"
            targetTitle="Khóa học mẫu"
          />
        </AppProviders>
      );

      expect(screen.getByText(/Báo cáo vi phạm khóa học/i)).toBeInTheDocument();
      expect(screen.getByText(/Lý do vi phạm/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Mô tả cụ thể hành vi vi phạm/i)).toBeInTheDocument();
      expect(screen.getByText('Gửi báo cáo vi phạm')).toBeInTheDocument();
    });
  });

  describe('SCR-MOD-02: Course Reports Page (/courses/:courseId/manage/reports)', () => {
    it('renders reports list and summary KPIs for course instructor', async () => {
      setMockPersonaCookie('user');
      setAccessToken('mock-access-token-user');

      renderAppAt('/courses/crs-clean-arch/manage/reports');

      await waitFor(() => {
        expect(screen.getByText('Báo cáo vi phạm khóa học')).toBeInTheDocument();
      });

      expect(screen.getByText(/Nội dung chứa liên kết quảng cáo spam ngoài luồng/i)).toBeInTheDocument();
      expect(screen.getByText(/Bình luận ngôn từ xúc phạm người học khác/i)).toBeInTheDocument();
    });
  });

  describe('SCR-MOD-03: Admin Reports Queue (/admin/reports)', () => {
    it('renders admin reports queue with AI Finding badge and filters', async () => {
      setMockPersonaCookie('admin');
      setAccessToken('mock-access-token-admin');

      renderAppAt('/admin/reports');

      await waitFor(() => {
        expect(screen.getByText(/Hàng đợi kiểm duyệt báo cáo vi phạm/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/Nội dung đạo văn từ khóa học khác/i)).toBeInTheDocument();
      });

      expect(screen.getAllByText(/PhoBERT AI/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('SCR-MOD-04: Admin Report Detail (/admin/reports/:id)', () => {
    it('renders report details, target preview and resolution controls', async () => {
      setMockPersonaCookie('admin');
      setAccessToken('mock-access-token-admin');

      renderAppAt('/admin/reports/rep-adm-1');

      await waitFor(() => {
        expect(screen.getByText(/Chi tiết & Xử lý báo cáo/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/Nội dung đối tượng tại thời điểm xem xét/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Xác nhận vi phạm/i)).toBeInTheDocument();
      expect(screen.getByText(/Bác bỏ báo cáo/i)).toBeInTheDocument();
    });
  });

  describe('SCR-MOD-05: Admin Sanctions Management (/admin/sanctions)', () => {
    it('renders sanctions management list and direct sanction modal button', async () => {
      setMockPersonaCookie('admin');
      setAccessToken('mock-access-token-admin');

      renderAppAt('/admin/sanctions');

      await waitFor(() => {
        expect(screen.getByText(/Quản lý chế tài kỷ luật & xử phạt/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/Spam bình luận quấy rối hàng loạt/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Áp dụng chế tài trực tiếp/i)).toBeInTheDocument();
    });
  });

  describe('SCR-MOD-06: Admin Audit Logs (/admin/audit-logs)', () => {
    it('renders immutable audit logs and filter options', async () => {
      setMockPersonaCookie('admin');
      setAccessToken('mock-access-token-admin');

      renderAppAt('/admin/audit-logs');

      await waitFor(() => {
        expect(screen.getByText(/Nhật ký kiểm toán hệ thống/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('REPORT_RESOLVE')).toBeInTheDocument();
      });

      expect(screen.getByText('SANCTION_APPLY')).toBeInTheDocument();
    });
  });

  describe('SCR-ADM-01: Admin Users Management (/admin/users)', () => {
    it('renders users table with roles and account control actions', async () => {
      setMockPersonaCookie('admin');
      setAccessToken('mock-access-token-admin');

      renderAppAt('/admin/users');

      await waitFor(() => {
        expect(screen.getByText(/Quản trị tài khoản & phân quyền người dùng/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('admin@brainmemo.io')).toBeInTheDocument();
      });

      expect(screen.getAllByText('ADMIN').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('spammer@example.com')).toBeInTheDocument();
    });
  });

  describe('SCR-ADM-02: Admin Announcements (/admin/announcements)', () => {
    it('renders broadcast announcement form with preview tab', async () => {
      setMockPersonaCookie('admin');
      setAccessToken('mock-access-token-admin');

      renderAppAt('/admin/announcements');

      await waitFor(() => {
        expect(screen.getByText(/Phát thông báo toàn hệ thống/i)).toBeInTheDocument();
      });

      expect(screen.getByPlaceholderText(/Bảo trì nâng cấp hệ thống máy chủ/i)).toBeInTheDocument();
      expect(screen.getByText('Xem trước (Preview)')).toBeInTheDocument();
    });
  });

  describe('Admin Dashboard (/admin)', () => {
    it('renders administration dashboard overview and metric cards', async () => {
      setMockPersonaCookie('admin');
      setAccessToken('mock-access-token-admin');

      renderAppAt('/admin');

      await waitFor(() => {
        expect(screen.getByText(/Tổng quan trung tâm quản trị BrainMemo/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Báo cáo chờ xử lý')).toBeInTheDocument();
      expect(screen.getByText('Cờ cảnh báo PhoBERT AI')).toBeInTheDocument();
      expect(screen.getByText('Tài khoản bị khóa')).toBeInTheDocument();
    });
  });
});
