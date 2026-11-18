import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/shared/api';
import '@/shared/i18n';
import { AppProviders } from '@/app/providers';
import { createAppQueryClient } from '@/app/queryClient';
import { setMockPersonaCookie } from '../../../../mocks/handlers';
import { AiGenerateModal } from '../components/AiGenerateModal';
import { AdminSystemSettingsPage } from '../pages/AdminSystemSettingsPage';

afterEach(() => {
  clearAccessToken();
  document.cookie = 'bm_mock_persona=; max-age=0; path=/';
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('S11 AI Features & Quota Management (SCR-AI-01, 02 + SCR-ADM-03)', () => {
  describe('SCR-AI-01 & SCR-AI-02: AiGenerateModal', () => {
    it('renders modal with Quiz tab by default and shows quota info', async () => {
      setMockPersonaCookie('user');
      setAccessToken('mock-access-token-user');

      const queryClient = createAppQueryClient({ disableRetry: true });
      render(
        <AppProviders queryClient={queryClient}>
          <AiGenerateModal
            isOpen={true}
            onClose={() => {}}
            courseId="course-test-123"
            defaultTab="QUIZ"
          />
        </AppProviders>
      );

      // Verify header and screen code
      expect(screen.getByText(/Tạo nội dung với AI/i)).toBeInTheDocument();
      expect(screen.getAllByText(/SCR-AI-01/i).length).toBeGreaterThan(0);

      // Verify quota is loaded from mock
      await waitFor(() => {
        expect(screen.getByText(/18 \/ 20/i)).toBeInTheDocument();
      });

      // Verify quiz controls
      expect(screen.getByText(/Sinh câu hỏi Quiz/i)).toBeInTheDocument();
      expect(screen.getByText(/Dán văn bản trực tiếp/i)).toBeInTheDocument();
      expect(screen.getByText(/Độ khó câu hỏi/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Bắt đầu tạo \(Quiz\)/i })).toBeInTheDocument();
    });

    it('switches to Flashcard tab and shows flashcard options', async () => {
      setMockPersonaCookie('user');
      setAccessToken('mock-access-token-user');

      const queryClient = createAppQueryClient({ disableRetry: true });
      render(
        <AppProviders queryClient={queryClient}>
          <AiGenerateModal
            isOpen={true}
            onClose={() => {}}
            courseId="course-test-123"
            currentChapterId="ch-mock-1"
            defaultTab="FLASHCARD"
          />
        </AppProviders>
      );

      expect(screen.getByText(/Sinh Flashcard \(SCR-AI-02\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Số lượng thẻ \(1 - 30\):/i)).toBeInTheDocument();
    });

    it('handles form submission and transitions to progress/completion', async () => {
      setMockPersonaCookie('user');
      setAccessToken('mock-access-token-user');

      const queryClient = createAppQueryClient({ disableRetry: true });
      render(
        <AppProviders queryClient={queryClient}>
          <AiGenerateModal
            isOpen={true}
            onClose={() => {}}
            courseId="course-test-123"
            defaultTab="QUIZ"
          />
        </AppProviders>
      );

      // Enter text prompt
      const textarea = screen.getByPlaceholderText(/Dán nội dung bài học, tài liệu/i);
      fireEvent.change(textarea, { target: { value: 'Machine Learning is a subset of artificial intelligence.' } });

      // Click generate button
      const submitBtn = screen.getByRole('button', { name: /Bắt đầu tạo \(Quiz\)/i });
      fireEvent.click(submitBtn);

      // Wait for completion view
      await waitFor(() => {
        expect(screen.getByText(/Tạo nội dung AI hoàn tất!/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/câu hỏi vào Ngân hàng câu hỏi/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Xác nhận & Xem nội dung/i })).toBeInTheDocument();
    });
  });

  describe('SCR-ADM-03: AdminSystemSettingsPage', () => {
    it('renders admin AI settings form with quota and provider selection', async () => {
      setMockPersonaCookie('admin');
      setAccessToken('mock-access-token-admin');

      const queryClient = createAppQueryClient({ disableRetry: true });
      render(
        <AppProviders queryClient={queryClient}>
          <AdminSystemSettingsPage />
        </AppProviders>
      );

      // Wait for settings to load
      await waitFor(() => {
        expect(screen.getByText(/Cấu hình hệ thống \(SCR-ADM-03\)/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Cấu hình Dịch vụ GenAI \(Quiz & Flashcard\)/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('20')).toBeInTheDocument();
      expect(screen.getByText(/Google Gemini API \(Mặc định\)/i)).toBeInTheDocument();

      // Update quota input and save
      const quotaInput = screen.getByDisplayValue('20');
      fireEvent.change(quotaInput, { target: { value: '35' } });
      expect(screen.getByDisplayValue('35')).toBeInTheDocument();

      const saveBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/Cập nhật cấu hình hệ thống thành công!/i)).toBeInTheDocument();
      });
    });
  });
});
