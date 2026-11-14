import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom';
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  SecuritySettingsPage,
  SessionSettingsPage,
  VerifyEmailPage,
} from '@/features/identity';
import {
  PublicProfilePage,
  EditProfilePage,
  PrivacySettingsPage,
  AppearanceSettingsPage,
} from '@/features/profile';
import {
  CourseDetailPage,
  CourseFormPage,
  CourseManagementLayout,
  CourseManagementHomePage,
} from '@/features/course';
import { RequireAdmin, RequireAuth, RequireVerifiedEmail } from './guards';
import { AdminLayout, AppLayout, PublicLayout, SettingsLayout } from './layouts';
import { HomeShellPage, LockedAccountPage, NotFoundPage, RouteStubPage } from './pages';
import { RouterRootShell } from './RouterRootShell';

export const appRoutes: RouteObject[] = [
  {
    element: <RouterRootShell />,
    children: [
      {
        path: '/locked',
        element: <LockedAccountPage />,
      },
      {
        element: <PublicLayout />,
        children: [
          { path: '/', element: <HomeShellPage /> },
          {
            path: '/courses',
            element: (
              <RouteStubPage
                screenCode="SCR-DSC-02"
                title="Khám phá khóa học"
                description="Danh mục khóa học công khai và bộ lọc tìm kiếm đang được tích hợp."
              />
            ),
          },
          {
            path: '/courses/:courseId',
            element: <CourseDetailPage />,
          },
          {
            path: '/users/:userId',
            element: <PublicProfilePage />,
          },
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
          { path: '/reset-password', element: <ResetPasswordPage /> },
          { path: '/verify-email', element: <VerifyEmailPage /> },
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
            path: '/learning-dashboard',
            element: (
              <RouteStubPage
                screenCode="SCR-LRN-01"
                title="Dashboard học tập"
                description="Theo dõi tiến độ học tập, biểu đồ hoạt động và kế hoạch học tập của bạn."
              />
            ),
          },
          {
            path: '/me/courses',
            element: <Navigate to="/manage/courses" replace />,
          },
          {
            path: '/me/bookmarks',
            element: (
              <RouteStubPage
                screenCode="SCR-LRN-07"
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
          {
            path: '/settings',
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to="/settings/profile" replace /> },
              { path: 'profile', element: <EditProfilePage /> },
              { path: 'security', element: <SecuritySettingsPage /> },
              { path: 'sessions', element: <SessionSettingsPage /> },
              { path: 'privacy', element: <PrivacySettingsPage /> },
              { path: 'appearance', element: <AppearanceSettingsPage /> },
            ],
          },
        ],
      },
      {
        element: (
          <RequireAuth>
            <CourseManagementLayout />
          </RequireAuth>
        ),
        children: [
          {
            path: '/manage/courses',
            element: <CourseManagementHomePage />,
          },
          {
            path: '/manage/questions',
            element: (
              <RouteStubPage
                screenCode="SCR-LMS-02"
                title="Ngân hàng câu hỏi"
                description="Hệ thống quản lý kho câu hỏi trắc nghiệm, tự luận và flashcard đang được hoàn thiện."
              />
            ),
          },
          {
            path: '/manage/resources',
            element: (
              <RouteStubPage
                screenCode="SCR-LMS-03"
                title="Quản lý tài nguyên"
                description="Kho tài liệu số, slide bài giảng, video và học liệu dùng chung cho các khóa học."
              />
            ),
          },
          {
            path: '/courses/new',
            element: (
              <RequireVerifiedEmail>
                <CourseFormPage />
              </RequireVerifiedEmail>
            ),
          },
          {
            path: '/courses/:courseId/edit',
            element: <CourseFormPage />,
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
