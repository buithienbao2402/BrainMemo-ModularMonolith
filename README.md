# BrainMemo - Nền tảng học tập trực tuyến

## Giới thiệu

BrainMemo là nền tảng LMS cho phép người dùng tự do đăng tải, chia sẻ và sử dụng các bộ học liệu do chính người dùng tạo ra. Hệ thống hỗ trợ các chức năng tương tự Moodle, đồng thời cung cấp bài kiểm tra và học bằng flashcard.

## Điểm vượt trội so với các LMS khác

- **Đánh giá năng lực linh hoạt:** đánh giá học viên theo chuẩn đầu ra AUN QA.
- **Kiểm duyệt nội dung tự động:** ứng dụng mô hình PhoBERT để quét và phát hiện nội dung vi phạm.
- **Tự động sinh nội dung học tập:** tích hợp API LLM để sinh câu hỏi và flashcard, giảm công sức soạn thủ công.

## Kiến trúc hệ thống

**Modular Monolith + Layered Architecture**

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Backend | C# .NET |
| Frontend | React + TypeScript |
| Database | MySQL |
| Storage | Cloudflare R2 / MinIO |
| DevOps | Docker Compose, Nginx, Cloudflare DNS & SSL, Jenkins CI/CD |


## Thiết kế giao diện

Link Figma: https://www.figma.com/design/JrZ2EN5MfRmx8JoHzaVz0L/UI-BrainMemo-LMS?node-id=0-1&t=7byuXLiQQSm0VyuI-1
