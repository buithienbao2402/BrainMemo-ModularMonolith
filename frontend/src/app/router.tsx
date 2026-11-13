import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  SecuritySettingsPage,
  VerifyEmailPage,
} from '@/features/identity';
import { RequireAdmin, RequireAuth, RequireVerifiedEmail } from './guards';
import { AdminLayout, AppLayout, PublicLayout } from './layouts';
import { HomeShellPage, LockedAccountPage, NotFoundPage, RouteStubPage } from './pages';
import { RouterRootShell } from './RouterRootShell';

export const appRoutes: RouteObject[] = [
  {
    element: <RouterRootShell />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/', element: <HomeShellPage /> },
          {
            path: '/courses',
            element: (
              <RouteStubPage
                screenCode="SCR-CRS-01"
                title="Khám phá khóa học"
                description="Danh mục khóa học công khai đang được hoàn thiện ở Sprint tiếp theo."
              />
            ),
          },
          {
            path: '/users/:userId',
            element: (
              <RouteStubPage
                screenCode="SCR-PRF-01"
                title="Hồ sơ công khai"
                description="Trang thông tin tác giả và danh sách khóa học công khai."
              />
            ),
          },
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
          { path: '/reset-password', element: <ResetPasswordPage /> },
          { path: '/verify-email', element: <VerifyEmailPage /> },
          { path: '/locked', element: <LockedAccountPage /> },
          { path: '/404', element: <NotFoundPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        element: (
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        ),
        children: [
          {
            path: '/me/courses',
            element: (
              <RouteStubPage
                screenCode="SCR-CRS-02"
                title="Khóa học của tôi"
                description="Không gian quản lý khóa học đã tham gia và đã tạo."
              />
            ),
          },
          {
            path: '/me/bookmarks',
            element: (
              <RouteStubPage
                screenCode="SCR-PRF-02"
                title="Khóa học đã lưu (Bookmark)"
                description="Danh sách khóa học được bạn đánh dấu."
              />
            ),
          },
          {
            path: '/notifications',
            element: (
              <RouteStubPage
                screenCode="SCR-NTF-01"
                title="Thông báo"
                description="Trung tâm thông báo học tập và phản hồi hệ thống."
              />
            ),
          },
          { path: '/settings/security', element: <SecuritySettingsPage /> },
          {
            path: '/courses/new',
            element: (
              <RequireVerifiedEmail>
                <RouteStubPage
                  screenCode="SCR-CRS-03"
                  title="Tạo khóa học mới"
                  description="Trình khởi tạo khóa học dành cho tác giả đã xác minh email."
                />
              </RequireVerifiedEmail>
            ),
          },
        ],
      },
      {
        path: '/admin',
        element: (
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        ),
        children: [
          {
            index: true,
            element: (
              <RouteStubPage
                screenCode="SCR-ADM-01"
                title="Tổng quan quản trị"
                description="Bảng điều khiển quản trị hệ thống BrainMemo LMS."
              />
            ),
          },
          {
            path: 'moderation',
            element: (
              <RouteStubPage
                screenCode="SCR-ADM-02"
                title="Kiểm duyệt nội dung"
                description="Hàng đợi kiểm duyệt khóa học và chương bài học."
                backTo="/admin"
              />
            ),
          },
          {
            path: 'reports',
            element: (
              <RouteStubPage
                screenCode="SCR-ADM-03"
                title="Báo cáo vi phạm"
                description="Xử lý báo cáo vi phạm từ người học và tác giả."
                backTo="/admin"
              />
            ),
          },
          {
            path: 'users',
            element: (
              <RouteStubPage
                screenCode="SCR-ADM-04"
                title="Quản lý tài khoản"
                description="Quản lý quyền và trạng thái khóa tài khoản."
                backTo="/admin"
              />
            ),
          },
          {
            path: 'courses',
            element: (
              <RouteStubPage
                screenCode="SCR-ADM-05"
                title="Quản lý khóa học"
                description="Theo dõi và điều phối khóa học toàn hệ thống."
                backTo="/admin"
              />
            ),
          },
          {
            path: 'ai-settings',
            element: (
              <RouteStubPage
                screenCode="SCR-ADM-06"
                title="Cấu hình AI kiểm duyệt"
                description="Thiết lập tham số và hạn mức tính năng AI."
                backTo="/admin"
              />
            ),
          },
          {
            path: 'audit-logs',
            element: (
              <RouteStubPage
                screenCode="SCR-ADM-07"
                title="Nhật ký hệ thống"
                description="Lịch sử thao tác quản trị và kiểm toán bảo mật."
                backTo="/admin"
              />
            ),
          },
          {
            path: 'settings',
            element: (
              <RouteStubPage
                screenCode="SCR-ADM-08"
                title="Cài đặt hệ thống"
                description="Cấu hình vận hành nền tảng BrainMemo."
                backTo="/admin"
              />
            ),
          },
        ],
      },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}
