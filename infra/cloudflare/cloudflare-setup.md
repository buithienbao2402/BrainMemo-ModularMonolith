# Cloudflare Production Deployment & Security Setup Guide (T-S12-OPS-01)

Tài liệu hướng dẫn cấu hình Cloudflare cho hệ thống **BrainMemo LMS** trên máy chủ Production VPS (tên miền chính thức `brainmemo.vn`).

---

## 1. Cấu hình DNS & Bật Proxy "Đám mây cam" (Orange Cloud)

1. Đăng nhập trang quản trị **Cloudflare Dashboard** → Chọn tên miền `brainmemo.vn`.
2. Vào mục **DNS** → **Records**:
   - Thêm bản ghi **A**:
     - **Name:** `@` (hoặc `brainmemo.vn`)
     - **IPv4 address:** `<IP_VPS_PRODUCTION>`
     - **Proxy status:** **Proxied (Đám mây màu cam bật)**
   - Thêm bản ghi **CNAME**:
     - **Name:** `www`
     - **Target:** `brainmemo.vn`
     - **Proxy status:** **Proxied (Đám mây màu cam bật)**
3. Lợi ích:
   - Ẩn địa chỉ IP gốc của VPS trước các cuộc tấn công DDoS/DDoS Layer 7.
   - Kích hoạt mạng lưới Cloudflare CDN toàn cầu (Anycast Network).

---

## 2. Thiết lập SSL/TLS Mode "Full (Strict)" & Cloudflare Origin CA

1. Vào mục **SSL/TLS** → **Overview**:
   - Chọn chế độ mã hóa: **Full (Strict)**.
   - Chế độ này yêu cầu Nginx trên VPS phải có chứng chỉ số hợp lệ ký bởi Cloudflare Origin CA hoặc Let's Encrypt.
2. Tạo chứng chỉ **Origin Certificate**:
   - Vào mục **SSL/TLS** → **Origin Server** → Nhấn **Create Certificate**.
   - **Key type:** RSA (2048) hoặc ECDSA (P-256).
   - **Hostnames:** `brainmemo.vn`, `*.brainmemo.vn`.
   - **Certificate Validity:** 15 years.
   - Nhấn **Create**.
3. Lưu trữ chứng chỉ trên VPS:
   - Sao chép nội dung Certificate lưu vào file: `infra/certs/origin.pem`
   - Sao chép nội dung Private Key lưu vào file: `infra/certs/origin.key`
   - Phân quyền an toàn:
     ```bash
     chmod 600 infra/certs/origin.key
     chmod 644 infra/certs/origin.pem
     ```
4. Vào mục **SSL/TLS** → **Edge Certificates**:
   - Bật **Always Use HTTPS**: `ON`.
   - Bật **HTTP Strict Transport Security (HSTS)**:
     - Enable HSTS: Checked
     - Max-Age: `1 year (31536000)`
     - Include subdomains: Checked
     - Preload: Checked
   - **Minimum TLS Version:** `TLS 1.2`
   - Bật **Automatic HTTPS Rewrites**: `ON`.

---

## 3. Cấu hình Cloudflare Cache Rules

Hệ thống BrainMemo là sự kết hợp giữa Frontend SPA và Backend API. Việc cấu hình Cache Rules giúp tăng tốc tải trang mà không gây cache nhầm dữ liệu API động.

Vào mục **Caching** → **Cache Rules** → Tạo 2 quy tắc:

### Quy tắc 1: Bỏ qua Cache cho toàn bộ API (`Bypass Cache for API`)
- **Rule name:** `Bypass API and Dynamic Endpoints`
- **When incoming requests match:**
  - Field: `URI Path`
  - Operator: `starts with`
  - Value: `/api/`
- **Then (Cache Eligibility):**
  - **Bypass cache**
- Đặt độ ưu tiên lên đầu tiên (Order: 1).

### Quy tắc 2: Tối ưu Cache cho tài nguyên tĩnh (`Cache Static Assets`)
- **Rule name:** `Cache Frontend Static Assets`
- **When incoming requests match:**
  - Field: `URI Path`
  - Operator: `starts with`
  - Value: `/assets/`
- **Then (Cache Eligibility):**
  - **Eligible for cache**
  - Edge Cache TTL: **1 month (30 days)**
  - Browser Cache TTL: **1 month (30 days)**

---

## 4. Thiết lập Cloudflare Zero Trust / Cloudflare Access cho `/admin/*`

Bảo vệ cổng quản trị viên (`/admin/*`) bằng xác thực 2 lớp Zero Trust, ngăn chặn brute-force và xâm nhập trái phép:

1. Vào mục **Zero Trust** trên thanh điều hướng Cloudflare (One.dash.cloudflare.com).
2. Vào **Access** → **Applications** → Nhấn **Add an application** → Chọn **Self-hosted**.
3. Cấu hình Application:
   - **Application name:** `BrainMemo Admin Portal`
   - **Application domain:** `brainmemo.vn`
   - **Path:** `/admin*`
   - **Session Duration:** `24 hours`
4. Cấu hình Policies (Chính sách truy cập):
   - **Policy name:** `Allow BrainMemo Core Team`
   - **Action:** `Allow`
   - **Assign user groups / Include:**
     - Selector: `Emails ending in` → `@brainmemo.vn` (hoặc danh sách email của quản trị viên cụ thể).
5. Khi người dùng truy cập bất kỳ đường dẫn nào dạng `https://brainmemo.vn/admin/...`:
   - Cloudflare sẽ hiển thị màn hình đăng nhập OTP hoặc Google Workspace SSO trước khi cho phép gửi gói tin về VPS.
