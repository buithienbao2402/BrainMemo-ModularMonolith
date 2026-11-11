# PRIORITY – Thứ tự ưu tiên & thứ tự làm cuốn chiếu

## 1. Nguyên tắc
1. **Cuốn chiếu theo lát dọc (slice):** mỗi slice = một nhóm chức năng, làm BE → FE (song song được nếu dùng mock) → INT, xong slice mới sang slice kế. Không làm hết BE rồi mới FE.
2. Slice sau chỉ bắt đầu khi **INT của slice trước DONE** (trừ khi bảng §4 cho phép song song).
3. Làm các thứ **nhiều module phụ thuộc** trước: nền tảng → Identity → Course → Content → Learning → Assessment → còn lại.
4. Luồng "demo được sớm": đăng ký → tạo khóa → soạn chương → học → làm bài → thấy điểm. Mọi thứ phụ (Top 10, AI, broadcast) để sau.

## 2. Mức ưu tiên
| Mức | Ý nghĩa | Nhóm yêu cầu |
|:-:|:--|:--|
| **P0** | Thiếu thì hệ thống không dùng được | NFR nền (JWT, phân quyền, phân trang, lỗi), FR-IDN-01..05,07,08, FR-CRS-01..08,10..13, FR-CNT-01,02,16,18, FR-LRN-01..03,15,16, kiểm tra quyền khóa–chương |
| **P1** | Giá trị lõi của LMS | FR-DSC-01,02,04,06..09; FR-CNT-04,07,09..15,17; FR-LRN-04..09; FR-AST-01..09; FR-LRN-10..13; FR-NTF-01,02,04..06; FR-PRF-01..06; FR-CRS-09,14,15,16 |
| **P2** | Mở rộng | CLO/PLO (FR-AST-10..16,20), FR-AST-17..19, FR-DSC-03,05,10, FR-CNT-05,06,08, Moderation (FR-MOD-*), FR-IDN-06,09..11, FR-NTF-03,07, FR-PRF-07 |
| **P3** | Làm sau cùng | AI (FR-AI-01..03), tối ưu hiệu năng/Lighthouse, e2e đầy đủ, hardening, triển khai production |

## 3. Quy tắc chuyển trạng thái giữa các slice
Một slice DONE khi: toàn bộ task BE/FE/INT DONE, e2e chức năng đạt, `openapi.yaml` đã khớp thực tế, `docs/handoff` đầy đủ.

## 4. Thứ tự slice
| Slice | Nội dung | Phụ thuộc | Mức | Song song được |
|:-:|:--|:--|:-:|:--|
| **S0** | Nền tảng: repo, CI, Docker dev, BuildingBlocks, host WebApi, FE khung + sinh type, DB baseline, tool gộp OpenAPI | – | P0 | – |
| **S1** | Identity: đăng ký, xác minh email, đăng nhập, refresh, đăng xuất, quên/đổi mật khẩu, phiên (+ Notification email tối thiểu, Profile tạo tự động) | S0 | P0 | – |
| **S2** | Profile + Files (upload R2) + Course CRUD (tạo/sửa/xóa mềm/chế độ/trạng thái/tag/bìa) | S1 | P0 | Profile ∥ Course |
| **S3** | Content cơ bản: chương, Block nội dung (text, ảnh, video, âm thanh, file, markdown, flashcard), lưu/đăng tải/lịch sử, tài nguyên | S2 | P0 | – |
| **S4** | Ghi danh + quyền khóa/chương (Public/Private/Only Me, passcode) + Learning đọc/tiến độ/bookmark | S3 | P0 | – |
| **S5** | Discovery: read model, trang chủ, tìm kiếm, lọc, sắp xếp (+ Course Outbox dispatcher) | S2 (event), S4 | P1 | ∥ S6 |
| **S6** | Bình luận + Notification in-app + đề cử + thống kê khóa | S4 | P1 | ∥ S5 |
| **S7** | Ngân hàng câu hỏi + Quiz (cấu hình, làm bài, autosave, nộp, **chấm tự động đồng bộ**, Outbox) | S4 | P1 | – |
| **S8** | Bài tập + chấm tay (quiz tự luận + bài tập) + bảng điểm/điểm tổng kết/xếp loại | S7 | P1 | – |
| **S9** | CLO/PLO + liên kết (từ Content và từ Chuẩn đầu ra) + mức đạt + thống kê + xuất báo cáo + đánh giá khóa | S8 | P2 | – |
| **S10** | Moderation + Admin + audit + chế tài + broadcast + dashboard | S6 | P2 | ∥ S9 |
| **S11** | AI: job sinh quiz/flashcard (Gemini) + quét vi phạm PhoBERT | S7 (câu hỏi), S10 | P3 | – |
| **S12** | Top 10, Google login, quản lý phiên nâng cao, hardening, Lighthouse, e2e ba luồng, triển khai VPS | S1–S11 | P2/P3 | – |

## 5. Đường găng
S0 → S1 → S2 → S3 → S4 → S7 → S8 (đây là đường quyết định thời gian). S5, S6, S9, S10 có thể chen song song nếu có thêm AI/người.

## 6. Rủi ro cần canh sớm
| Rủi ro | Giảm thiểu |
|:--|:--|
| Hợp đồng lệch giữa BE/FE | Prism mock + test hợp đồng ở INT mỗi slice |
| Quyền khóa–chương sai | Bộ test ma trận 3.2.2 ngay ở S4 (bảng dữ liệu → test tham số hóa) |
| Transaction xuyên module (Moderation) | Làm `IModerationTransaction` + test rollback ở S10 trước khi viết chế tài |
| Race: refresh token, Admin cuối, ghi danh | Test đồng thời (2 request) ở Integration test |
| Rò đáp án | Test: response `readChapter/getQuizAttempt` không chứa `isCorrect` trước thời điểm cho phép |
| Gemini free hết hạn mức | `ILlmClient` đổi provider bằng cấu hình; xử lý `AI_UNAVAILABLE` |
| Ngoài phạm vi (scope creep) | AGENT.md §9; mọi yêu cầu mới đi qua DECISIONS |