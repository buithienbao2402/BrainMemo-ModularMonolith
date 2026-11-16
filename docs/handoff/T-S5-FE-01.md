# Handoff Note – T-S5-FE-01

## 1. Thông tin task
- **Task ID:** `T-S5-FE-01`
- **Mô tả:** Frontend Discovery (Batched):
  - `SCR-DSC-01`: Trang chủ Khám phá (`/`):
    - Hero banner giới thiệu BrainMemo và spaced repetition, nút CTA "Khám phá khóa học" (`/courses`) và "Bắt đầu học ngay" (`/register` cho khách).
    - Khối "Đang học dở" (chỉ hiển thị khi đã đăng nhập) kèm thanh tiến độ % và link vào thẳng bài học.
    - Khối "Đề xuất cho bạn" (ngẫu nhiên mỗi lần tải, không cache giữa các lần tải theo FR-DSC-02 / `staleTime: 0`, `refetchOnMount: 'always'`), nút "Đổi gợi ý" làm mới.
    - Khối "Mới cập nhật" sắp xếp theo thời gian cập nhật gần nhất.
    - Khối "Bảng xếp hạng Top 10" chuyển đổi linh hoạt 3 metric (Học viên, Đề cử, Đánh giá) và 3 khung thời gian (Tuần, Tháng, Tất cả thời gian).
  - `SCR-DSC-02`: Trang Khám phá & Tìm kiếm khóa học (`/courses`):
    - Thanh tìm kiếm từ khóa kèm nút xóa và lịch sử tìm kiếm gần đây (cho người dùng đã đăng nhập).
    - Bộ lọc bên trái: Chế độ truy cập (Tất cả, PUBLIC, PRIVATE), Trạng thái (Tất cả, UPDATING, COMPLETED, PAUSED), Chủ đề & Thẻ (Tags). Nút "Đặt lại" toàn bộ bộ lọc.
    - 6 chế độ sắp xếp theo FR-DSC-09: `RECENTLY_UPDATED`, `NEWEST_LAUNCH`, `MOST_LEARNERS`, `MOST_NOMINATED`, `MOST_REVIEWED`, `MOST_COMMENTED`.
    - Đồng bộ 2 chiều với URL Search Parameters (`useSearchParams`) đảm bảo URL giữ query khi F5 hoặc chia sẻ.
    - Phân trang chuẩn với tổng số kết quả và trang hiện tại / tổng số trang.
  - Tích hợp MSW handlers và đồng bộ routing.
- **Nhánh Git:** `dev/kim-thuan`
- **Vai trò:** Frontend Developer (FE)
- **Tình trạng:** DONE (7/7 tests passed, 0 type errors)

---

## 2. Các thành phần đã triển khai

### 2.1. API & TanStack Query Hooks
- `frontend/src/features/discovery/api/discoveryApi.ts`:
  - `useHomeDiscoveryQuery`: Truy vấn `GET /discovery/home` với cấu hình không cache `staleTime: 0, gcTime: 0, refetchOnMount: 'always'`.
  - `useSearchCoursesQuery`: Truy vấn `GET /discovery/courses` với đầy đủ bộ lọc và 6 tiêu chuẩn sắp xếp.
  - `useSearchHistoryQuery`: Truy vấn `GET /discovery/search-history` cho người dùng đã đăng nhập.
  - `useTop10Query`: Truy vấn `GET /discovery/top10` theo metric và window.
- `frontend/src/shared/api/queryKeys.ts`: Bổ sung cây query key `discovery` (`home`, `courses`, `top10`, `searchHistory`, `ranking`).

### 2.2. Giao diện & Màn hình
- `frontend/src/features/discovery/components/CourseCardItem.tsx`: Thẻ khóa học hiển thị ảnh bìa, nhãn chế độ truy cập (Public/Private), nhãn trạng thái (Completed, Paused), tags, tác giả, số học viên, điểm đánh giá và số đề cử.
- `frontend/src/features/discovery/pages/DiscoveryHomePage.tsx` (`SCR-DSC-01`): Màn hình trang chủ tích hợp cả phiên bản khách vãng lai và học viên đăng nhập.
- `frontend/src/features/discovery/pages/CourseDiscoveryPage.tsx` (`SCR-DSC-02`): Màn hình tìm kiếm, lọc đa tiêu chí, lịch sử tìm kiếm và đồng bộ query parameters lên URL.
- `frontend/src/app/router.tsx`: Gắn kết route `/` và `/courses`.

### 2.3. Hạ tầng Mocks (MSW)
- `frontend/mocks/handlers.ts`: Bổ sung handlers cho `/discovery/home`, `/discovery/courses`, `/discovery/top10`, `/discovery/search-history`, `/courses/:id/ranking`.

---

## 3. Kết quả Kiểm thử

1. **Frontend Typecheck:**
   - Lệnh: `pnpm --filter frontend typecheck`
   - Kết quả: **0 errors**, sạch 100%.

2. **Frontend Discovery Unit Tests:**
   - Lệnh: `pnpm --filter frontend vitest run src/features/discovery`
   - Kết quả: **7/7 tests passed (100% xanh)**:
     - `SCR-DSC-01`: Trang chủ khám phá (3 tests).
     - `SCR-DSC-02`: Khám phá khóa học (4 tests).
