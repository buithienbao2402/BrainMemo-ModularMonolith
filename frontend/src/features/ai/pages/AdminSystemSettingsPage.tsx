import React, { useState, useEffect } from 'react';
import { Settings, Bot, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Skeleton } from '@/shared/ui';
import { useAdminSettings, useUpdateAdminSettings } from '../api/aiApi';

export function AdminSystemSettingsPage() {
  const { data: settings, isLoading, isError, refetch } = useAdminSettings();
  const updateMutation = useUpdateAdminSettings();

  const [aiDailyQuota, setAiDailyQuota] = useState<number>(20);
  const [aiLlmProvider, setAiLlmProvider] = useState<'GEMINI' | 'OPENAI' | 'ANTHROPIC'>('GEMINI');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setAiDailyQuota(settings.aiDailyQuota);
      setAiLlmProvider(settings.aiLlmProvider);
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    setSaveError(null);

    try {
      await updateMutation.mutateAsync({
        aiDailyQuota,
        aiLlmProvider,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      const msg = err?.detail || err?.message || 'Không thể lưu cài đặt hệ thống.';
      setSaveError(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <p className="font-semibold">Lỗi khi tải cấu hình hệ thống.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Cấu hình hệ thống (SCR-ADM-03)
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Quản lý các thông số vận hành nền tảng, hạn mức tài nguyên và dịch vụ trí tuệ nhân tạo (AI)
            </p>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Cập nhật cấu hình hệ thống thành công! Các thay đổi đã được áp dụng ngay lập tức.</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Bot className="h-5 w-5 text-purple-500" />
            <h2 className="text-base font-bold text-foreground">
              Cấu hình Dịch vụ GenAI (Quiz & Flashcard)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Daily Quota */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Hạn mức AI hàng ngày (lượt / người dùng / ngày UTC):
              </label>
              <input
                type="number"
                min={0}
                max={500}
                value={aiDailyQuota}
                onChange={(e) => setAiDailyQuota(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-xs p-3 rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <p className="text-[11px] text-muted-foreground">
                Số lần tối đa mỗi tài khoản được yêu cầu AI sinh câu hỏi hoặc flashcard mỗi ngày.
              </p>
            </div>

            {/* LLM Provider */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Nhà cung cấp mô hình LLM (aiLlmProvider):
              </label>
              <select
                value={aiLlmProvider}
                onChange={(e) => setAiLlmProvider(e.target.value as any)}
                className="w-full text-xs p-3 rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="GEMINI">Google Gemini API (Mặc định)</option>
                <option value="OPENAI">OpenAI API</option>
                <option value="ANTHROPIC">Anthropic Claude API</option>
              </select>
              <p className="text-[11px] text-muted-foreground">
                Nhà cung cấp dịch vụ LLM bên ngoài phụ trách xử lý sinh nội dung (DEC-21, DEC-30).
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </div>
  );
}
