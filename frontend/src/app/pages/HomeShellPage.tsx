import { useAuth } from '@/shared/hooks';
import { setMockPersonaCookie } from '@mocks/handlers';
import {
  ContinueLearningSection,
  RecentlyUpdatedSection,
  LeaderboardSection,
  NewLaunchAndCompletedSection,
  RandomExploreSection,
  LatestReviewsSection,
  NominatedCoursesSection,
} from '@/features/home/components';

const MOCK_PERSONAS = [
  { id: 'guest', label: 'Khách (Guest)' },
  { id: 'user', label: 'Học viên (Quang Trần)' },
  { id: 'unverified', label: 'Chưa xác minh email' },
  { id: 'admin', label: 'Quản trị viên (Admin)' },
] as const;

export function HomeShellPage() {
  const { status, user, refreshAuthSession, logout } = useAuth();
  const isMockEnabled = import.meta.env.VITE_USE_MOCK === 'true';

  const isAuthenticated = status === 'authenticated' && Boolean(user);

  const handleSelectPersona = async (persona: (typeof MOCK_PERSONAS)[number]['id']) => {
    setMockPersonaCookie(persona);
    if (persona === 'guest') {
      await logout();
      return;
    }
    await refreshAuthSession();
  };

  return (
    <div className="mx-auto max-w-[1280px] space-y-12 px-4 py-8 sm:px-6">
      {/* 1. KHU VỰC TIẾP TỤC HỌC (CHỈ HIỂN THỊ KHI ĐÃ ĐĂNG NHẬP THEO FIGMA FRAME 15:2490) */}
      {isAuthenticated && (
        <ContinueLearningSection />
      )}

      {/* 2. KHU VỰC "MỚI CẬP NHẬT" (5 DÒNG KHÓA HỌC NGANG) */}
      <RecentlyUpdatedSection />

      {/* 3. KHU VỰC "BẢNG XẾP HẠNG" (3 CỘT TOP 10: ĐỀ CỬ, ĐÁNH GIÁ, HỌC VIÊN) */}
      <LeaderboardSection />

      {/* 4. KHU VỰC "MỚI RA MẮT & ĐÃ HOÀN THÀNH" (CÙNG HÀNG CHIA ĐÔI 50/50) */}
      <NewLaunchAndCompletedSection />

      {/* 5. KHU VỰC "KHÁM PHÁ NGẪU NHIÊN" (LƯỚI 2 HÀNG X 5 THẺ DỌC = 10 THẺ) */}
      <RandomExploreSection />

      {/* 6. KHU VỰC "ĐÁNH GIÁ MỚI NHẤT" (LƯỚI 3 HÀNG X 2 CỘT = 6 THẺ REVIEW) */}
      <LatestReviewsSection />

      {/* 7. KHU VỰC "MỚI ĐƯỢC ĐỀ CỬ" (HÀNG CUỘN NGANG THẺ NHỎ ~220PX) */}
      <NominatedCoursesSection />

      {/* Floating Mock Persona Switcher for Development & QA */}
      {isMockEnabled && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur-md">
          <span className="px-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Mock Persona:
          </span>
          <select
            value={!isAuthenticated ? 'guest' : user?.isAdmin ? 'admin' : !user?.emailVerified ? 'unverified' : 'user'}
            onChange={(e) => void handleSelectPersona(e.target.value as any)}
            className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground focus:outline-none"
            aria-label="Chọn mock persona để kiểm thử"
          >
            {MOCK_PERSONAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
