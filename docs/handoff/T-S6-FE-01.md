# Handoff Document: T-S6-FE-01 (Social & Notifications - Batched)

## 1. Overview
Implemented frontend features for Social interactions and Notifications according to S6 specifications:
- `SCR-NTF-01`: Notification Center Page and Header Bell Dropdown popover (FR-NTF-01, FR-NTF-02, FR-NTF-03).
- `SCR-LRN-06`: Course & Chapter Comments & Discussions inside Learning Player with 1-level reply nesting, pin/unpin, and soft-delete (FR-LRN-07, FR-LRN-08, FR-LRN-09, FR-LRN-10).
- `SCR-CRS-01` & `SCR-CRS-04`: Course Nomination Button & Summary integration (FR-CRS-15, FR-CRS-16).

## 2. Changes Made
### Notifications:
- `frontend/src/features/notification/api/notificationApi.ts`:
  - Queries: `useNotificationsQuery`, `useUnreadCountQuery` with background polling efficiency (`refetchIntervalInBackground: false`).
  - Mutations: `useMarkNotificationReadMutation`, `useMarkAllNotificationsReadMutation`, `useDeleteNotificationMutation`.
- `frontend/src/features/notification/components/NotificationItem.tsx`:
  - Renders notifications with icons by category (info, warning, success, error, system, nomination), relative time, unread indicator, and action buttons.
- `frontend/src/features/notification/components/NotificationDropdown.tsx`:
  - Quick dropdown popover in top bar with unread count badge, latest 5 notifications, mark all as read action, and link to `/notifications`.
- `frontend/src/features/notification/pages/NotificationsPage.tsx`:
  - Full notifications center at `/notifications` with tabs (Tất cả / Chưa đọc), mark all as read, paginated list, empty state, and delete action.
- `frontend/src/app/layouts/NotificationBellLink.tsx`:
  - Updated to mount `NotificationDropdown`.

### Social Comments & Q&A:
- `frontend/src/features/learning/api/commentsApi.ts`:
  - Types and API queries/mutations for course comments (`useCommentsQuery`, `useCommentsSummaryQuery`, `createComment`, `editComment`, `deleteComment`, `pinComment`, `unpinComment`).
- `frontend/src/features/learning/components/CommentSection.tsx`:
  - Renders discussion header with total count.
  - Root comment composer.
  - Pinned comments banner & badge ("Đã ghim bởi Giảng viên").
  - Enforced max 1 level reply nesting (replies have no "Trả lời" CTA).
  - Soft-delete rendering ("Bình luận này đã bị xóa").
  - Owner moderation actions (Ghim / Bỏ ghim, Xóa).
  - Inline reply composer with `@Author` prefill.
- `frontend/src/features/learning/pages/LearningPlayerPage.tsx`:
  - Mounted `CommentSection` below chapter navigation.

### Course Nomination:
- `frontend/src/features/course/components/NominationButton.tsx`:
  - Interactive heart button displaying nomination count and toggle state (active/inactive).
  - Handles auth check and optimistic/toast feedback.
- `frontend/src/features/course/pages/CourseDetailPage.tsx`:
  - Fully integrated nomination button for enrolled and guest learners.

### Mocks & Testing:
- `frontend/mocks/handlers.ts`:
  - Added mock endpoints for `/notifications`, `/notifications/:id/read`, `/notifications/read-all`, `/notifications/:id`, `/courses/:courseId/comments`, `/courses/:courseId/comments/summary`, `/comments/:id`, `/comments/:id/pin`, `/courses/:courseId/nominations/summary`.
- Unit tests:
  - `frontend/src/features/notification/tests/notificationsSuite.test.tsx`: 5/5 passed.
  - `frontend/src/features/learning/tests/commentsSuite.test.tsx`: 3/3 passed.
  - `frontend/src/features/course/tests/nominationSuite.test.tsx`: 1/1 passed.
  - `frontend/src/features/course/tests/coursePages.test.tsx`: 15/15 passed.

## 3. Verification
- `pnpm --filter frontend typecheck`: 0 errors.
- `pnpm --filter frontend vitest run ...`: 24/24 tests passed across all touched modules.
- `dotnet build backend/BrainMemo.sln`: 0 warnings, 0 errors.
