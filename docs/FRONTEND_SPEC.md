# FRONTEND_SPEC

Nguồn thiết kế: **ảnh PNG xuất từ Figma**, đặt ở `docs/design/figma-png/`, tên `SCR-<MOD>-<nn>__<slug>.png`.
AI web chat không mở được Figma: người điều phối **đính kèm PNG** của đúng màn hình trong prompt giao task. Nếu thiếu PNG cho màn hình trong task → AI DỪNG, ghi `docs/OPEN_QUESTIONS.md`, không tự bịa giao diện.
Hành vi/dữ liệu lấy từ OpenAPI; giao diện lấy từ PNG; khi hai bên lệch → OpenAPI thắng về dữ liệu, PNG thắng về bố cục.

## 1. Stack
Vite + React 18 + TypeScript (strict) · React Router 6 (data router) · TanStack Query 5 · React Hook Form + Zod · Tailwind + shadcn/ui · Tiptap (rich text) · `openapi-typescript` + `openapi-fetch` · date-fns · react-i18next (chỉ `vi`) · Vitest + Testing Library · Playwright · MSW/Prism (mock).
Gói: pnpm. Lint: ESLint + Prettier. Node ≥ 20.

## 2. Cấu trúc & quy ước code
```
src/app/        router.tsx, providers.tsx, layouts/(PublicLayout|AppLayout|AdminLayout), guards/
src/shared/api/ schema.d.ts(SINH) client.ts errors.ts queryKeys.ts
src/shared/ui/  Button, Dialog, DataTable, Pagination, Toast, FormField, EmptyState, ErrorState, Skeleton...
src/features/<module>/{api,components,pages,hooks,schemas,tests}
```
- Mỗi `operationId` → một hàm trong `features/<m>/api/*.ts` (`useXxxQuery`/`useXxxMutation`). Không gọi `fetch` ngoài `shared/api/client.ts`.
- Type lấy từ `schema.d.ts`, **cấm tự khai báo lại DTO**.
- Query key: `[module, resource, params]` trong `queryKeys.ts`; mutation invalidate đúng key.
- Form: Zod schema trong `schemas/`; thông báo lỗi tiếng Việt; map `Problem.errors[].field` vào field của form; giữ dữ liệu form khi lỗi (NFR-20).
- Text UI tiếng Việt, đặt trong `shared/i18n/vi.json`.
- Phân trang: component `Pagination` dùng `page/pageSize` (≤ 50).
- Thời gian: hiển thị theo múi giờ trình duyệt; gửi UTC.

## 3. Xác thực & phiên
- Access token giữ **trong bộ nhớ** (module-level store), không localStorage. Refresh cookie HttpOnly do trình duyệt tự gửi (`credentials: 'include'`).
- Khởi động app: gọi `POST /auth/refresh` → nạp `getMe`. 401 ở request → **single-flight refresh** (một promise dùng chung) → thử lại một lần → thất bại thì về `/login?next=`.
- `403 ACCOUNT_LOCKED` → trang SCR-COM-03 (lý do, hạn).
- Guard: `RequireAuth`, `RequireAdmin`, `RequireVerifiedEmail` (cho tạo khóa/AI: hiện banner "Xác minh email").
- Theme: `uiTheme` từ hồ sơ; Khách theo `prefers-color-scheme`.

## 4. Xử lý lỗi (chuẩn chung)
| Tình huống | Hành vi |
|:--|:--|
| 422 | hiển thị lỗi theo field |
| 401 | refresh rồi retry; không được thì về login |
| 403 + `PASSCODE_REQUIRED` | mở dialog nhập passcode chương |
| 403 + `NOT_ENROLLED` | CTA "Tham gia khóa học" |
| 404 | trang SCR-COM-02 (không phân biệt "không tồn tại"/"bị ẩn") |
| 409 `VERSION_CONFLICT` | dialog "Chương đã được sửa ở nơi khác" → Tải lại / Sao chép nội dung của tôi |
| 409 khác | toast với `title` của Problem |
| 429 | toast + vô hiệu nút 10 giây |
| 5xx/mạng | toast "Có lỗi, thử lại" + nút thử lại; thao tác ghi dài hiển thị trạng thái đang xử lý/thành công/thất bại |
Thao tác nguy hiểm (xóa khóa, khóa tài khoản, xóa vĩnh viễn, xóa học viên) luôn có hộp xác nhận.

## 5. Upload tệp (DEC-05)
1. `POST /files/upload-urls` (purpose, tên, dung lượng, contentType). FE kiểm trước: ảnh ≤ 5 MB, tệp ≤ 20 MB, đuôi cho phép.
2. `PUT uploadUrl` thẳng lên R2 (kèm `headers`), có thanh tiến trình (XHR).
3. Gửi `uploadKey` trong request nghiệp vụ (cập nhật hồ sơ, tạo khóa, tạo tài nguyên, lưu nháp bài nộp, tạo báo cáo). Lỗi `FILE_TOO_LARGE/FILE_TYPE_NOT_ALLOWED` hiển thị tại ô tải.
4. URL tệp trong response là Presigned (15 phút); khi 403/hết hạn → refetch query, không cache lâu.

## 5b. Quy tắc theo thời gian thực (polling)
| Dữ liệu | Chu kỳ |
|:--|:--|
| `notifications/unread-count` | 30 giây (chỉ khi tab hiển thị) |
| `ai/jobs/{id}` | 2 giây đến khi COMPLETED/FAILED, tối đa 3 phút |
| Quiz autosave | debounce 3 giây sau thay đổi + tối đa 30 giây/lần; cảnh báo khi mất mạng; lưu lại khi online |
| Đồng hồ quiz | dựa `deadlineAt` và `serverNow` ban đầu (tính lệch), tự gọi submit khi về 0 |

## 6. Danh sách màn hình (mã khớp PNG)
Cột "Truy cập": G=Khách, U=người dùng đăng nhập, L=Học viên Đang học, O=Chủ khóa, A=Admin.

### Chung & Xác thực
| Mã | Route | Truy cập | API chính | Ghi chú |
|:--|:--|:-:|:--|:--|
| SCR-COM-01 | (layout) | tất cả | getMe, getUnreadCount | Header: tìm kiếm, chuông, avatar menu; Admin có mục Quản trị |
| SCR-COM-02 | `*` | tất cả | – | 404 chung |
| SCR-COM-03 | `/locked` | U | – | Tài khoản bị khóa: lý do, hạn |
| SCR-AUTH-01 | `/login` | G | login, loginWithGoogle | Có nút Google |
| SCR-AUTH-02 | `/register` | G | register | Hiện hướng dẫn kiểm tra email |
| SCR-AUTH-03 | `/forgot-password` | G | forgotPassword | Luôn báo "nếu email tồn tại…" |
| SCR-AUTH-04 | `/reset-password?token=` | G | resetPassword | |
| SCR-AUTH-05 | `/verify-email?token=` | G/U | verifyEmail | Trang kết quả |
| SCR-AUTH-06 | `/settings/security` | U | changePassword, listSessions, revokeSession, logoutAll | |

### Khám phá
| Mã | Route | Truy cập | API | Ghi chú |
|:--|:--|:-:|:--|:--|
| SCR-DSC-01 | `/` | G | getHome | 3 khối: Mới cập nhật, Đề xuất (ngẫu nhiên, không cache giữa lần tải), Đang học dở (U) |
| SCR-DSC-02 | `/courses` | G | searchCourses, listSearchHistory | Lọc tag/chế độ/trạng thái, 6 sắp xếp, lịch sử (U); URL giữ query |
| SCR-DSC-03 | `/top10` | G | getTop10 | Tab chỉ số × kỳ |

### Khóa học & ghi danh
| Mã | Route | Truy cập | API | Ghi chú |
|:--|:--|:-:|:--|:--|
| SCR-CRS-01 | `/courses/:courseId` | G | getCourse, listChapters, enroll, leaveCourse, nominateCourse, listReviews | Nút theo `viewer.enrollmentStatus`; mục lục; khu đánh giá |
| SCR-CRS-02 | `/courses/new`, `/courses/:courseId/edit` | O (+email xác minh) | createCourse, updateCourse, deleteCourse, createUploadUrl | Chế độ truy cập, trạng thái, tag ≤10, bìa |
| SCR-CRS-03 | `/me/courses` | U | listMyCourses, listMyInvitations | Tab Đã tạo/Đang học + lời mời |
| SCR-CRS-04 | `/courses/:courseId/manage` | O | getCourseStats | Khung quản lý (menu: Nội dung, Học viên, Ngân hàng câu hỏi, Chuẩn đầu ra, Chấm bài, Bảng điểm, Thống kê, Đánh giá, Cài đặt) |
| SCR-CRS-05 | `/courses/:courseId/manage/students` | O | listEnrollments, inviteLearner, decideEnrollmentRequest, removeLearner | Tab theo trạng thái |
| SCR-CRS-06 | `/courses/:courseId/manage/access` | O | updateCourse, getChapterAccess, setChapterAccess | Bảng quy tắc kết hợp khóa–chương; cảnh báo khi đổi sang Private/Only Me |

### Nội dung (Chủ khóa)
| Mã | Route | API | Ghi chú |
|:--|:--|:--|:--|
| SCR-CNT-01 | `/courses/:courseId/manage/content` | listChapters, createChapter, reorderChapters, deleteChapter | Kéo thả sắp xếp |
| SCR-CNT-02 | `.../content/:chapterId` | getChapterDraft, saveChapter, publishChapter | Soạn Block (10 loại); **không tự lưu**, cảnh báo thoát khi chưa lưu; nút Xem trước (giao diện đọc, `view=draft`); `baseVersionNo` |
| SCR-CNT-03 | `.../content/:chapterId/versions` | listChapterVersions, restoreChapterVersion | Chỉ khôi phục về nháp |
| SCR-CNT-04 | `.../questions` | listQuestions, getQuestionBank, setDifficultyScheme, exportQuestions | Bộ lọc tag/độ khó/loại/trạng thái |
| SCR-CNT-05 | `.../questions/:questionId` | create/updateQuestion, setQuestionStatus, getQuestionUsage | Form theo 6 loại; READY chỉ khi hợp lệ |
| SCR-CNT-06 | (panel trong CNT-02) | saveChapter | Cấu hình Quiz: thời gian, lượt, ngưỡng đạt %, hiển thị kết quả, đảo, mật khẩu, câu thủ công/ngẫu nhiên, tiên quyết; **+ ô "Liên kết CLO"** gọi `upsertComponent` (DEC-09) |
| SCR-CNT-07 | `.../resources` | listResources, createResource, deleteResource, createUploadUrl | |
| SCR-CNT-08 | (dialog) | importQuestions | Báo cáo lỗi theo dòng |
| SCR-CNT-09 | `.../quizzes/:blockId/exceptions` | list/upsert/deleteQuizException | |

### Học tập
| Mã | Route | Truy cập | API | Ghi chú |
|:--|:--|:-:|:--|:--|
| SCR-LRN-01 | `/courses/:courseId/learn/:chapterId?` | G/L | readChapter, completeBlock, answerPracticeQuestion, getCourseProgress, setBookmark | Mở Block ⇒ `completeBlock` (chỉ khi `canSaveProgress`); dialog passcode; Khách chỉ đọc |
| SCR-LRN-02 | `/courses/:courseId/quizzes/:blockId` | L | getPublishedQuiz (từ readChapter), listMyQuizAttempts, startQuizAttempt | Thông tin, mật khẩu, số lượt còn |
| SCR-LRN-03 | `/quiz-attempts/:attemptId` | L | getQuizAttempt, saveQuizAnswer, submitQuizAttempt | Danh sách câu đã/chưa làm, đồng hồ, nhảy câu, autosave, khôi phục khi F5 |
| SCR-LRN-04 | `/quiz-attempts/:attemptId/result` | L | getQuizAttempt/submit result | Hiển thị theo `resultDisplay`; "Đã nộp, đang chấm" khi `gradingPending`; "Chờ chấm tay" cho tự luận |
| SCR-LRN-05 | `/courses/:courseId/assignments/:blockId` | L | getMySubmission, saveSubmissionDraft, submitAssignment | Tự lưu, tệp ≤ giới hạn, hiển thị `isLate`, điểm/nhận xét |
| SCR-LRN-06 | (component) | L/O | list/create/edit/delete/pinComment, createReport | Trả lời 1 cấp; ghim (O); báo cáo |
| SCR-LRN-07 | `/me/bookmarks` | L | listMyBookmarks | |

### Chuẩn đầu ra & chấm điểm
| Mã | Route | Truy cập | API | Ghi chú |
|:--|:--|:-:|:--|:--|
| SCR-AST-01 | `.../manage/assessment` | O | get/updateAssessmentConfig | Ngưỡng, quy tắc chọn điểm, thang xếp loại, mức đạt, Bloom, bật PLO |
| SCR-AST-02 | `.../manage/outcomes` | O | list/create/update/deleteClo, Plo | |
| SCR-AST-03 | `.../manage/outcomes/mapping` | O | listAssessableBlocks, upsertComponent | Ma trận bài × CLO, trọng số; cảnh báo tổng trọng số ≠ 100 (không chặn) |
| SCR-AST-04 | `.../manage/grading` | O | listGradingQueue | |
| SCR-AST-05 | `.../manage/grading/:kind/:id` | O | getAttemptForReview, gradeAttemptManually, getSubmissionForGrading, gradeSubmission | |
| SCR-AST-06 | `/courses/:courseId/gradebook` | L | getMyGradebook | Điểm thành phần, tổng kết, xếp loại, mức đạt CLO + đóng góp |
| SCR-AST-07 | `.../manage/gradebook` | O | listCourseGradebook, getStudentGradebook, getComponentScores, exportAssessment | |
| SCR-AST-08 | `.../manage/stats` | O | getAssessmentStats | Biểu đồ phân bố, CLO |
| SCR-AST-09 | `.../reviews` | G/L/O | listReviews, upsertMyReview, replyReview | |

### Hồ sơ & Thông báo
| Mã | Route | API |
|:--|:--|:--|
| SCR-PRF-01 | `/users/:userId` | getPublicProfile, listProfileCourses |
| SCR-PRF-02 | `/settings/profile` | getMyProfile, updateMyProfile |
| SCR-NTF-01 | (dropdown chuông) + `/notifications` | listNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification |

### AI
| Mã | Route | API |
|:--|:--|:--|
| SCR-AI-01 | (dialog trong SCR-CNT-04) | createQuizJob, getAiJob, getAiQuota |
| SCR-AI-02 | (dialog trong SCR-CNT-02) | createFlashcardJob, getAiJob; duyệt Block FLASHCARD `PENDING` → `APPROVED` bằng saveChapter |

### Báo cáo & Quản trị
| Mã | Route | Truy cập | API |
|:--|:--|:-:|:--|
| SCR-MOD-01 | `/admin` | A | adminGetDashboard |
| SCR-MOD-02 | `/admin/reports` | A | adminListReports |
| SCR-MOD-03 | `/admin/reports/:id` | A | adminGetReport, adminGetReportTargetContent (chỉ đọc), adminResolveReport |
| SCR-MOD-04 | `/admin/sanctions` | A | adminListSanctions, adminApplySanction, adminLiftSanction |
| SCR-MOD-05 | `/admin/audit-logs` | A | adminListAuditLogs |
| SCR-MOD-06 | (dialog "Báo cáo") | L/O | createReport, createUploadUrl |
| SCR-ADM-01 | `/admin/users` | A | adminListUsers, grantAdmin, revokeAdmin, adminApplySanction |
| SCR-ADM-02 | `/admin/announcements` | A | createAnnouncement |
| SCR-ADM-03 | `/admin/settings` | A | adminGetSettings, adminUpdateSettings |

## 7. Giao diện & truy cập
- Responsive từ 360 px; dark/light theo token (CSS variables); component keyboard-accessible; `aria-*` cho dialog/tab; màu tương phản đạt WCAG AA.
- Lighthouse Performance ≥ 70 (mobile) cho SCR-DSC-01 và SCR-LRN-01: code-splitting theo route, lazy-load Tiptap, ảnh `loading=lazy`.
- Khách: không hiển thị nút lưu tiến độ/bookmark/bình luận; thay bằng CTA đăng nhập.
- Hiển thị Only Me/Tạm ẩn cho Chủ khóa: nhãn trạng thái rõ.

## 8. Mock & tích hợp từng chức năng
- Chưa có BE: `VITE_USE_MOCK=true` → Prism (`prism mock openapi/openapi.yaml`) hoặc MSW; FE làm xong màn hình với dữ liệu mock, đạt Definition of Done FE.
- Khi BE của chức năng đó đã merge: vai INT đổi `VITE_USE_MOCK=false`, chạy e2e chức năng, sửa lệch hợp đồng.
- Biến môi trường: `VITE_API_BASE_URL=/api/v1`, `VITE_USE_MOCK`.

## 9. Kiểm thử FE (Definition of Done)
- Typecheck, lint, build sạch.
- Vitest: schema form + hook xử lý lỗi + component logic chính.
- Mỗi màn hình có test ≥ 1 luồng chính (Testing Library) với MSW.
- Playwright (do INT): xem §3 backlog (ba luồng bắt buộc NFR-17).