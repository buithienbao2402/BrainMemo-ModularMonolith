# BrainMemo Production Operations Scripts (T-S12-OPS-01)

Thư mục chứa các kịch bản tự động hóa vận hành, sao lưu và diễn tập khôi phục thảm họa (Disaster Recovery Rehearsal) cho hệ thống **BrainMemo LMS**.

---

## 1. Kịch bản sao lưu MySQL tự động (`backup-mysql.sh`)

### Tính năng
- Sử dụng `mysqldump` với cờ `--single-transaction`, `--quick`, `--routines`, `--triggers`, `--events`, `--hex-blob` đảm bảo dữ liệu nhất quán mà không khóa bảng (Zero-downtime).
- Nén gzip mức độ 9 để tiết kiệm dung lượng lưu trữ đĩa cứng VPS.
- Kiểm tra tính toàn vẹn của tệp nén (`gzip -t`).
- **Chính sách lưu trữ (Retention Policy):** Tự động xóa các bản sao lưu cũ hơn **7 ngày**.
- Tích hợp gửi cảnh báo qua Webhook (Slack / Telegram / Discord) nếu quá trình sao lưu gặp sự cố.

### Cài đặt Crontab trên VPS
Chạy lệnh `crontab -e` trên máy chủ và thêm dòng sau để tự động sao lưu vào lúc 02:00 sáng UTC mỗi ngày:
```bash
0 2 * * * /opt/brainmemo/infra/scripts/backup-mysql.sh >> /var/log/brainmemo-backup.log 2>&1
```

---

## 2. Kịch bản diễn tập khôi phục dữ liệu (`restore-mysql.sh`)

### Tính năng
- Kiểm tra tính toàn vẹn của tệp sao lưu trước khi phục hồi.
- Tự động tạo cơ sở dữ liệu diễn tập (mặc định: `brainmemo_lms_rehearsal`) để tránh ghi đè dữ liệu đang chạy của người dùng thật.
- Bơm dữ liệu và kiểm tra số lượng bảng sau khi hoàn tất.

### Cách chạy diễn tập
```bash
# Cấp quyền thực thi
chmod +x infra/scripts/*.sh

# Chạy diễn tập phục hồi vào cơ sở dữ liệu thử nghiệm
./infra/scripts/restore-mysql.sh /backups/mysql/brainmemo_brainmemo_lms_20261118_020000.sql.gz brainmemo_lms_rehearsal
```

---

## 3. Khởi chạy Production với Docker Compose

```bash
# 1. Chuẩn bị file cấu hình môi trường
cp infra/env/.env.prod.example .env.production
chmod 600 .env.production

# 2. Khởi chạy toàn bộ hệ thống
docker compose -f infra/docker-compose.prod.yml up -d

# 3. Kiểm tra trạng thái các container
docker compose -f infra/docker-compose.prod.yml ps
```
