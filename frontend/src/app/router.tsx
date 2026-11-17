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
  CourseOverviewPage,
  CourseStudentsPage,
  CourseAccessPage,
} from '@/features/course';
import {
  LearningPlayerPage,
  MyBookmarksPage,
  QuizPlayerPage,
  QuizResultPage,
  AssignmentPlayerPage,
} from '@/features/learning';
import {
  AssessmentConfigPage,
  GradingQueuePage,
  ManualGradingPage,
  CourseGradebookPage,
  LearnerGradebookPage,
  OutcomesManagementPage,
  OutcomeMappingMatrixPage,
  AssessmentStatsPage,
  CourseReviewsManagePage,
} from '@/features/assessment';
import {
  ChapterListPage,
  ChapterEditorPage,
  ChapterVersionHistoryPage,
  ResourceManagementPage,
  QuestionBankPage,
} from '@/features/content';
import {
  DiscoveryHomePage,
  CourseDiscoveryPage,
  Top10LeaderboardPage,
} from '@/features/discovery';
import { NotificationsPage } from '@/features/notification';
import { MessagesPage } from '@/features/messaging';
import {
  CourseReportsPage,
  AdminReportsPage,
  AdminReportDetailPage,
  AdminCourseReviewsPage,
  AdminSanctionsPage,
  AdminAuditLogsPage,
} from '@/features/moderation';
import {
  AdminDashboardPage,
  AdminUsersPage,
  AdminAnnouncementsPage,
} from '@/features/admin';
import { AdminSystemSettingsPage } from '@/features/ai';
import { RequireAdmin, RequireAuth, RequireVerifiedEmail } from './guards';
import { AdminLayout, AppLayout, PublicLayout, SettingsLayout } from './layouts';
import { LockedAccountPage, NotFoundPage, RouteStubPage } from './pages';
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
          { path: '/', element: <DiscoveryHomePage /> },
          { path: '/top10', element: <Top10LeaderboardPage /> },
          {
            path: '/courses',
            element: <CourseDiscoveryPage />,
          },
          {
            path: '/courses/:courseId',
            element: <CourseDetailPage />,
          },
          {
            path: '/courses/:courseId/learn',
            element: <LearningPlayerPage />,
          },
          {
            path: '/courses/:courseId/learn/:chapterId',
            element: <LearningPlayerPage />,
          },
          {
            path: '/courses/:courseId/quiz-attempts/:attemptId',
            element: (
              <RequireAuth>
                <QuizPlayerPage />
              </RequireAuth>
            ),
          },
          {
            path: '/courses/:courseId/quiz-attempts/:attemptId/result',
            element: (
              <RequireAuth>
                <QuizResultPage />
              </RequireAuth>
            ),
          },
          {
            path: '/courses/:courseId/assignments/:blockId',
            element: (
              <RequireAuth>
                <AssignmentPlayerPage />
              </RequireAuth>
            ),
          },
          {
            path: '/courses/:courseId/gradebook',
            element: (
              <RequireAuth>
                <LearnerGradebookPage />
              </RequireAuth>
            ),
          },
          {
            path: '/quiz-attempts/:attemptId',
            element: (
              <RequireAuth>
                <QuizPlayerPage />
              </RequireAuth>
            ),
          },
          {
            path: '/quiz-attempts/:attemptId/result',
            element: (
              <RequireAuth>
                <QuizResultPage />
              </RequireAuth>
            ),
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
            element: <MyBookmarksPage />,
          },
          {
            path: '/me/messages',
            element: <MessagesPage />,
          },
          {
            path: '/notifications',
            element: <NotificationsPage />,
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
            element: <QuestionBankPage />,
          },
          {
            path: '/manage/resources',
            element: <ResourceManagementPage />,
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
          {
            path: '/courses/:courseId/manage',
            element: <CourseOverviewPage />,
          },
          {
            path: '/courses/:courseId/manage/overview',
            element: <CourseOverviewPage />,
          },
          {
            path: '/courses/:courseId/manage/students',
            element: <CourseStudentsPage />,
          },
          {
            path: '/courses/:courseId/manage/access',
            element: <CourseAccessPage />,
          },
          {
            path: '/courses/:courseId/manage/content',
            element: <ChapterListPage />,
          },
          {
            path: '/courses/:courseId/manage/content/new',
            element: <ChapterEditorPage />,
          },
          {
            path: '/courses/:courseId/manage/content/:chapterId',
            element: <ChapterEditorPage />,
          },
          {
            path: '/courses/:courseId/manage/content/:chapterId/versions',
            element: <ChapterVersionHistoryPage />,
          },
          {
            path: '/courses/:courseId/manage/resources',
            element: <ResourceManagementPage />,
          },
          {
            path: '/courses/:courseId/manage/questions',
            element: <QuestionBankPage />,
          },
          {
            path: '/courses/:courseId/manage/assessment',
            element: <AssessmentConfigPage />,
          },
          {
            path: '/courses/:courseId/manage/grading',
            element: <GradingQueuePage />,
          },
          {
            path: '/courses/:courseId/manage/grading/:kind/:id',
            element: <ManualGradingPage />,
          },
          {
            path: '/courses/:courseId/manage/gradebook',
            element: <CourseGradebookPage />,
          },
          {
            path: '/courses/:courseId/manage/outcomes',
            element: <OutcomesManagementPage />,
          },
          {
            path: '/courses/:courseId/manage/outcomes/mapping',
            element: <OutcomeMappingMatrixPage />,
          },
          {
            path: '/courses/:courseId/manage/stats',
            element: <AssessmentStatsPage />,
          },
          {
            path: '/courses/:courseId/manage/reviews',
            element: <CourseReviewsManagePage />,
          },
          {
            path: '/courses/:courseId/manage/reports',
            element: <CourseReportsPage />,
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
            element: <AdminDashboardPage />,
          },
          {
            path: 'reports',
            element: <AdminReportsPage />,
          },
          {
            path: 'course-reviews',
            element: <AdminCourseReviewsPage />,
          },
          {
            path: 'reports/:id',
            element: <AdminReportDetailPage />,
          },
          {
            path: 'sanctions',
            element: <AdminSanctionsPage />,
          },
          {
            path: 'users',
            element: <AdminUsersPage />,
          },
          {
            path: 'announcements',
            element: <AdminAnnouncementsPage />,
          },
          {
            path: 'audit-logs',
            element: <AdminAuditLogsPage />,
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
            element: <AdminSystemSettingsPage />,
          },
          {
            path: 'settings',
            element: <AdminSystemSettingsPage />,
          },
        ],
      },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}
