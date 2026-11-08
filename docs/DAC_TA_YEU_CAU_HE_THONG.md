# ĐẶC TẢ YÊU CẦU HỆ THỐNG
## MỤC LỤC

1. Mục tiêu và quy ước
2. Các tác nhân hệ thống
3. Đặc tả yêu cầu chức năng (FR)
   - 3.1. Identity Module
   - 3.2. Course Module
   - 3.3. Content Module
   - 3.4. Learning Module
   - 3.5. Assessment Module
   - 3.6. Discovery Module
   - 3.7. Profile Module
   - 3.8. Notification Module
   - 3.9. Moderation Module
   - 3.10. AI Module
4. Ma trận phân quyền
5. Đặc tả yêu cầu phi chức năng (NFR)

---

## 1. MỤC TIÊU VÀ QUY ƯỚC

Tài liệu mô tả yêu cầu chức năng và phi chức năng của **10 module**:

1. **Identity:** xác thực, tài khoản, phiên đăng nhập, phân quyền, trạng thái khóa tài khoản.
2. **Course:** thông tin khóa học, chế độ truy cập khóa/chương, ghi danh, đề cử, thống kê cơ bản.
3. **Content:** cấu trúc Course → Chapter → Block, ngân hàng câu hỏi, cấu hình bài kiểm tra, phiên bản, tài nguyên đính kèm.
4. **Learning:** học tập, tiến độ, làm bài kiểm tra/bài tập, bình luận, kiểm tra quyền học.
5. **Assessment:** kết quả, chấm điểm, bảng điểm, chuẩn đầu ra AUN-QA (PLO tùy chọn, CLO, Bloom), thống kê, đánh giá khóa học, xuất báo cáo.
6. **Discovery:** trang chủ, tìm kiếm, lọc, sắp xếp, Top 10.
7. **Profile:** hồ sơ cá nhân, quyền riêng tư, cài đặt giao diện.
8. **Notification:** thông báo trong ứng dụng, email, thông báo hệ thống.
9. **Moderation:** báo cáo vi phạm, chế tài, audit log.
10. **AI:** sinh quiz, sinh flashcard, quét nội dung vi phạm.

---

**Quy ước mã yêu cầu:**

| Tiền tố | Phân hệ |
|:--|:--|
| `FR-IDN` | Identity |
| `FR-CRS` | Course |
| `FR-CNT` | Content |
| `FR-LRN` | Learning |
| `FR-AST` | Assessment |
| `FR-DSC` | Discovery |
| `FR-PRF` | Profile |
| `FR-NTF` | Notification |
| `FR-MOD` | Moderation |
| `FR-AI` | AI |
| `NFR` | Phi chức năng |

---

## 2. CÁC TÁC NHÂN HỆ THỐNG

| Tác nhân | Role | Trách nhiệm |
|:--|:--|:--|
| **Khách** | `Guest` | Chưa đăng nhập. Xem Discovery và thông tin công khai của khóa học; đọc chương khi khóa học Public và chương Public (`FR-LRN-16`). Không lưu dữ liệu học tập; mọi thao tác gắn danh tính yêu cầu đăng nhập. |
| **Người dùng** | `User` | Tài khoản đã đăng nhập. Mọi người dùng đều tạo được khóa học. Vai trò theo ngữ cảnh: **Học viên** (ghi danh, học, làm bài, bình luận, đánh giá, đề cử, báo cáo) và **Chủ khóa** (tạo/quản lý khóa học, soạn nội dung, chấm bài, thiết lập chuẩn đầu ra, xem thống kê, dùng AI sinh nội dung). Một người dùng có thể vừa là Chủ khóa ở khóa này, vừa là Học viên ở khóa khác; không có role Instructor riêng. |
| **Admin** | `Admin` | Quản trị toàn hệ thống: xử lý báo cáo, áp dụng chế tài, quản lý người dùng và role, xem audit log, gửi thông báo hệ thống, cấu hình hệ thống. |
| **Hệ thống / Backend** | `System` | Thành phần xử lý, không phải vai trò người dùng: kiểm tra quyền, tự nộp bài khi hết giờ, tính tiến độ và mức đạt CLO, tạo/gửi thông báo, tự gỡ chế tài khi hết hạn, quét nội dung bằng AI. |

---

## 3. ĐẶC TẢ YÊU CẦU CHỨC NĂNG (FR)

### 3.1. Identity Module

| Mã YC | Tên chức năng | Đặc tả | Tác nhân |
|:--|:--|:--|:--|
| **FR-IDN-01** | Đăng ký tài khoản | Đăng ký bằng email và mật khẩu. | Khách |
| **FR-IDN-02** | Xác minh email | Xác minh email của tài khoản đã đăng ký. | Người dùng |
| **FR-IDN-03** | Đăng nhập | Đăng nhập bằng tài khoản đã đăng ký. | Khách |
| **FR-IDN-04** | Đăng xuất | Đăng xuất khỏi hệ thống. | Người dùng |
| **FR-IDN-05** | Làm mới token | Hỗ trợ refresh token; refresh token có thể thu hồi. | Người dùng, Hệ thống |
| **FR-IDN-06** | Đăng nhập bằng Google | Đăng nhập qua OAuth của Google. | Khách |
| **FR-IDN-07** | Quên mật khẩu | Đặt lại mật khẩu qua email. | Khách |
| **FR-IDN-08** | Đổi mật khẩu | Cho phép người dùng đổi mật khẩu. | Người dùng |
| **FR-IDN-09** | Quản lý phiên đăng nhập | Xem và thu hồi từng phiên đăng nhập. | Người dùng |
| **FR-IDN-10** | Đăng xuất khỏi tất cả thiết bị | Thu hồi toàn bộ phiên đăng nhập. | Người dùng |
| **FR-IDN-11** | Quản lý người dùng và role | Admin xem danh sách người dùng, cấp/thu hồi role Admin. Không được thu hồi role của Admin cuối cùng. Tài khoản Admin đầu tiên được tạo bằng dữ liệu khởi tạo (seed). | Admin |

#### 3.1.1. Phân quyền

1. **Quan hệ với tài nguyên** được backend kiểm tra: chủ khóa, học viên có ghi danh hợp lệ, chủ sở hữu dữ liệu cá nhân.
2. **Policy/authorization handler dùng chung:** Identity cung cấp cơ chế kiểm tra quyền qua Contract công khai; các module gọi cơ chế này tại backend/API.
3. **Trạng thái tài khoản:** Hoạt động, Bị khóa có thời hạn, Bị khóa vĩnh viễn. Tài khoản bị khóa không đăng nhập được, mọi refresh token bị thu hồi và các API yêu cầu xác thực bị chặn. Khóa có thời hạn tự động gỡ khi hết hạn.
4. **Thứ tự kiểm tra:** trạng thái tài khoản → role → quyền trên tài nguyên. Ẩn nút trên giao diện không thay thế kiểm tra tại backend.
5. **Khóa học Only Me:** chỉ chủ khóa được truy cập; Admin không có ngoại lệ ở tầng ứng dụng.
6. **Admin** có toàn bộ chức năng quản trị; không có cơ chế phân chia quyền giữa các Admin.

---

### 3.2. Course Module

| Mã YC | Tên chức năng | Đặc tả | Tác nhân |
|:--|:--|:--|:--|
| **FR-CRS-01** | Tạo khóa học | Tạo khóa học mới gồm: tên, mô tả, ảnh bìa, tag, chế độ truy cập, người tạo, ngày tạo, ngày cập nhật. Người tạo là Chủ khóa. Mọi người dùng đăng nhập (không bị khóa) đều được tạo. | Người dùng |
| **FR-CRS-02** | Xem thông tin khóa học | Xem thông tin khóa theo quyền truy cập (mục 3.2.2). Khách chỉ xem thông tin công khai. | Khách, Người dùng |
| **FR-CRS-03** | Chỉnh sửa thông tin khóa học | Chủ khóa chỉnh sửa thông tin khóa. | Chủ khóa |
| **FR-CRS-04** | Xóa khóa học | Xóa mềm; khóa chuyển sang trạng thái Đã xóa, không hiển thị với người dùng thông thường. Xóa vĩnh viễn chỉ Admin (`FR-MOD-09`). | Chủ khóa |
| **FR-CRS-05** | Quản lý trạng thái khóa học | Các trạng thái ở mục 3.2.1. Chủ khóa đặt Đang cập nhật / Đã hoàn thành / Tạm dừng. Tạm ẩn do Admin thực hiện (`FR-MOD-07`, `FR-MOD-08`); không áp dụng cho khóa Only Me. | Chủ khóa, Admin |
| **FR-CRS-06** | Thiết lập chế độ truy cập khóa học | Chọn một trong ba chế độ: Public, Private, Only Me (mục 3.2.2). | Chủ khóa |
| **FR-CRS-07** | Thiết lập chế độ truy cập chương | Mỗi chương chọn Public hoặc Protected; Protected có passcode riêng của chương. Chương không có chế độ Only Me. Quy tắc kết hợp ở mục 3.2.2. | Chủ khóa |
| **FR-CRS-08** | Ghi danh tự do | Học viên tự ghi danh khóa Public bằng nút tham gia ở trang giới thiệu khóa. Ghi danh chỉ ghi nhận quan hệ học viên – khóa, không đồng nghĩa mở khóa mọi chương (chương Protected vẫn cần passcode). | Học viên |
| **FR-CRS-09** | Mời học viên | Chủ khóa mời học viên vào khóa Public hoặc Private; học viên chấp nhận để thành Đang học (trạng thái Đã mời). | Chủ khóa, Học viên |
| **FR-CRS-10** | Duyệt yêu cầu tham gia | Với khóa Private, học viên gửi yêu cầu (Chờ duyệt); Chủ khóa chấp nhận hoặc từ chối. | Học viên, Chủ khóa |
| **FR-CRS-11** | Hủy ghi danh | Học viên tự rời khóa (Đã rời); tiến độ được giữ. Khóa Public: ghi danh lại và khôi phục tiến độ. Khóa Private: phải được mời hoặc duyệt lại. | Học viên |
| **FR-CRS-12** | Xem danh sách học viên | Chủ khóa xem học viên theo trạng thái ghi danh (mục 3.2.3). | Chủ khóa |
| **FR-CRS-13** | Xóa học viên khỏi khóa | Chủ khóa đưa học viên ra khỏi khóa (Bị xóa). | Chủ khóa |
| **FR-CRS-14** | Thống kê cơ bản khóa học | Số học viên đang học, số học viên đã hoàn thành, tỷ lệ hoàn thành, số bình luận, số chương, số đề cử. | Chủ khóa |
| **FR-CRS-15** | Đề cử khóa học | Học viên hoặc Chủ khóa đề cử khóa theo quy tắc mục 3.2.4. | Học viên, Chủ khóa |
| **FR-CRS-16** | Thu hồi đề cử | Người đã đề cử thu hồi đề cử của mình. | Học viên, Chủ khóa |

#### 3.2.1. Trạng thái khóa học

1. **Đang cập nhật.**
2. **Đã hoàn thành.**
3. **Tạm dừng.**
4. **Tạm ẩn:** do Admin áp dụng; người dùng thông thường không thấy và không truy cập được; Chủ khóa vẫn xem và chỉnh sửa được. Học viên đã ghi danh tạm thời mất quyền truy cập, tiến độ được giữ.
5. **Đã xóa:** xóa mềm; dữ liệu được giữ để phục hồi/truy vết; xóa vĩnh viễn chỉ Admin.

Trạng thái 1–3 do Chủ khóa đặt và đều hiển thị công khai (nếu đủ điều kiện hiển thị).

#### 3.2.2. Chế độ truy cập và quy tắc kết hợp khóa – chương

**Chế độ truy cập khóa học**

| Chế độ | Ý nghĩa |
|:--|:--|
| **Public** | Ai cũng thấy thông tin; ghi danh tự do. |
| **Private** | Thông tin cơ bản hiển thị ở Discovery; chỉ người được mời hoặc được duyệt (Đang học) mới vào nội dung. |
| **Only Me** | Chỉ Chủ khóa thấy, truy cập, sử dụng. Áp dụng cho mọi vai trò kể cả Admin: không ai khác tìm thấy, xem, mở, tải hoặc thao tác qua chức năng nghiệp vụ. Không xuất hiện trong bất kỳ khu vực Discovery nào; không cho ghi danh; không bị báo cáo; không bị AI quét kiểm duyệt (`FR-AI-03`). |

**Chế độ truy cập chương học:** **Public** (không thêm điều kiện ngoài quyền của khóa) hoặc **Protected** (yêu cầu passcode của chương). Học viên nhập đúng passcode được ghi nhớ cho tài khoản đó cho đến khi Chủ khóa đổi passcode.

**Quy tắc kết hợp:** quyền truy cập chương **không được vượt quá** giới hạn của khóa cha. Quyền hiệu lực = giao của điều kiện khóa và điều kiện chương.

| Khóa | Chương | Khách / người dùng chưa ghi danh | Học viên Đang học | Chủ khóa |
|:--|:--|:--|:--|:--|
| Public | Public | Đọc được (không lưu dữ liệu) | Đọc, lưu tiến độ | Có |
| Public | Protected | Không | Có, sau khi nhập passcode | Có (không cần passcode) |
| Private | Public | Không | Có | Có |
| Private | Protected | Không | Có, sau khi nhập passcode | Có |
| Only Me | Mọi chương (cấu hình chương bị bỏ qua) | Không | Không | Có |

- Người dùng đã đăng nhập nhưng chưa ghi danh khóa Public có quyền như Khách.
- Khi đổi khóa sang Private, người chưa ghi danh mất quyền đọc ngay; khi đổi sang Only Me, học viên đã ghi danh mất quyền truy cập, dữ liệu ghi danh và tiến độ được giữ, và khôi phục nếu đổi lại.

**Quy tắc cho Khách:** Khách xem Discovery và thông tin công khai mà không cần đăng nhập; chỉ đọc nội dung khi khóa Public và chương Public. Khách dùng được các Block công khai không cần danh tính: xem nội dung, phát media, mở tài liệu, lật flashcard, thử trả lời câu hỏi trong phiên. Kết quả/tiến độ của Khách không được lưu. Bình luận, bookmark, ghi danh, nộp bài có lưu kết quả, đánh giá, đề cử, báo cáo yêu cầu đăng nhập.

#### 3.2.3. Trạng thái ghi danh

| Trạng thái | Ý nghĩa | Được học? |
|:--|:--|:-:|
| **Chờ duyệt** | Học viên xin vào khóa Private, chờ Chủ khóa duyệt. | Không |
| **Đã mời** | Chủ khóa đã mời, chờ học viên chấp nhận. | Không |
| **Đang học** | Ghi danh hợp lệ. | Có |
| **Đã rời** | Học viên tự hủy; giữ tiến độ. | Không |
| **Bị xóa** | Chủ khóa đưa ra khỏi khóa. | Không |

#### 3.2.4. Đề cử khóa học

- **Điều kiện:** học viên ở trạng thái Đang học tại thời điểm đề cử, hoặc là Chủ khóa của khóa đó (Chủ khóa được đề cử khóa của chính mình).
- **Số lượng:** mỗi người (kể cả Chủ khóa) tối đa **một** đề cử cho mỗi khóa; có thể thu hồi, thu hồi xong có thể đề cử lại.
- **Dữ liệu:** ghi thời điểm đề cử để tính Top 10 theo tuần/tháng/toàn thời gian (`FR-DSC-10`) và sắp xếp theo số lượt đề cử (`FR-DSC-09`).
- **Hiệu lực:** đề cử giữ nguyên khi học viên rời khóa (Đã rời) hoặc bị xóa khỏi khóa; không tính vào xếp hạng khi khóa không còn đủ điều kiện hiển thị công khai.
- **Khác với đánh giá:** đề cử là tín hiệu "thích" một chạm, không có sao và nhận xét; đánh giá (`FR-AST-17`) gồm số sao và nhận xét. Hai chức năng độc lập.

---

### 3.3. Content Module

Tất cả chức năng của module này do **Chủ khóa** thực hiện (trừ khi nêu khác).

| Mã YC | Tên chức năng | Đặc tả | Tác nhân |
|:--|:--|:--|:--|
| **FR-CNT-01** | Tổ chức nội dung phân cấp | Nội dung theo cấu trúc **Course → Chapter → Block**. Chương có trạng thái Nháp hoặc Đã đăng tải. | Chủ khóa |
| **FR-CNT-02** | Quản lý Block | Hỗ trợ các loại Block ở mục 3.3.1. Khách chỉ xem/sử dụng Block thuộc chương Public của khóa Public; thao tác của Khách không lưu thành tiến độ hoặc kết quả. | Chủ khóa; Học viên; Khách |
| **FR-CNT-03** | Xem trước ở chế độ nháp | Xem chương hoặc bài kiểm tra ở chế độ nháp trước khi đăng tải; giao diện soạn khác giao diện đọc của học viên. | Chủ khóa |
| **FR-CNT-04** | Quản lý ngân hàng câu hỏi | Mỗi khóa có ngân hàng câu hỏi riêng. Mỗi câu hỏi gồm: tag (chủ đề, chương, kỹ năng...), độ khó, giải thích, loại câu hỏi/đáp án, điểm, trạng thái (mục 3.3.1). | Chủ khóa |
| **FR-CNT-05** | Nhập câu hỏi từ Excel/CSV | Nhập câu hỏi vào ngân hàng từ file Excel/CSV. | Chủ khóa |
| **FR-CNT-06** | Xuất ngân hàng câu hỏi | Xuất ngân hàng ra CSV/Excel. | Chủ khóa |
| **FR-CNT-07** | Lọc và xem danh sách câu hỏi | Lọc câu hỏi trong ngân hàng theo tag, độ khó, loại, trạng thái. | Chủ khóa |
| **FR-CNT-08** | Xem thông tin sử dụng câu hỏi | Hiển thị câu hỏi nằm trong bài kiểm tra nào, số lượt làm, tỷ lệ trả lời đúng; đọc từ Assessment qua Contract. | Chủ khóa |
| **FR-CNT-09** | Cấu hình câu hỏi trong bài kiểm tra | Cấu hình đáp án, giải thích, điểm; chọn có/không đảo thứ tự đáp án và đảo thứ tự câu hỏi giữa các bài làm của từng học viên. | Chủ khóa |
| **FR-CNT-10** | Thiết lập danh sách câu hỏi của bài kiểm tra | (1) Thêm/xóa câu hỏi thủ công hoặc chọn từ ngân hàng (kèm điểm). (2) Lấy ngẫu nhiên số lượng câu hỏi từ ngân hàng theo ràng buộc thuộc tính. (3) Sắp xếp thứ tự thủ công. Khi học viên đã nhận đề, thứ tự câu hỏi và đáp án được giữ cố định nếu tải lại trang. | Chủ khóa, Hệ thống |
| **FR-CNT-11** | Cấu hình thông tin bài kiểm tra | (1) Tên và mô tả. (2) Thời gian mở/đóng (hẹn giờ tự đăng) hoặc thời gian làm bài (đăng ngay khi bấm đăng tải). (3) Số lần được làm. (4) Điểm ngưỡng đạt. | Chủ khóa |
| **FR-CNT-12** | Liên kết bài kiểm tra/bài tập với CLO | Gắn bài kiểm tra hoặc bài tập vào một hoặc nhiều CLO kèm trọng số, theo `FR-AST-13`. Mặc định bài kiểm tra không tự ghi điểm vào CLO nếu chưa được liên kết. | Chủ khóa |
| **FR-CNT-13** | Cấu hình hiển thị kết quả | Thời điểm hiển thị: ngay sau khi chọn đáp án; ngay sau khi nộp; sau khi đóng bài; chấm sau. | Chủ khóa |
| **FR-CNT-14** | Điều kiện truy cập bài kiểm tra | Mật khẩu bài thi và điều kiện tiên quyết (ví dụ phải hoàn thành một chương hoặc bài trước). | Chủ khóa |
| **FR-CNT-15** | Ngoại lệ cho học viên | Thêm học viên ngoại lệ: thêm thời gian, thêm lượt làm hoặc dời hạn. | Chủ khóa |
| **FR-CNT-16** | Lưu nháp và đăng tải | Hỗ trợ lưu nháp và đăng tải. Hệ thống không tự lưu; phiên bản nháp chỉ được lưu khi người dùng chủ động lưu. | Chủ khóa |
| **FR-CNT-17** | Lịch sử chỉnh sửa và khôi phục | Xem lịch sử chỉnh sửa, khôi phục phiên bản trước. | Chủ khóa |
| **FR-CNT-18** | Quản lý tài nguyên đính kèm | Tải lên tài nguyên (ảnh, video, âm thanh, PDF, tệp .zip và các định dạng cho phép); quản lý dung lượng và định dạng theo `NFR-08`. | Chủ khóa |

#### 3.3.1. Loại Block, loại câu hỏi và thuộc tính câu hỏi

**Các loại Block**

1. Rich text.
2. Hình ảnh.
3. Video.
4. Âm thanh.
5. File đính kèm.
6. Markdown.
7. Flashcard.
8. Câu hỏi (câu hỏi đơn lẻ làm tại chỗ).
9. Bài tập: mô tả, chỗ nộp, giới hạn dung lượng, thời hạn nộp, điểm (nếu có).
10. Bài kiểm tra: tập hợp câu hỏi có cấu hình riêng (`FR-CNT-09` đến `FR-CNT-15`).

**Các loại câu hỏi:** trắc nghiệm một hoặc nhiều đáp án; Đúng/Sai; điền khuyết; ghép cặp; tự luận ngắn; tự luận.

**Độ khó** (tùy chọn), một trong ba cách: mô tả dễ – khó; mức 1–5; hoặc Nhận biết / Thông hiểu / Vận dụng / Vận dụng cao.

**Trạng thái câu hỏi:** Nháp, Sẵn sàng, Lưu trữ. Chỉ câu hỏi Sẵn sàng mới được thêm vào bài kiểm tra. Câu hỏi do AI sinh ra luôn ở trạng thái Nháp (`FR-AI-01`).

---

### 3.4. Learning Module

| Mã YC | Tên chức năng | Đặc tả | Tác nhân |
|:--|:--|:--|:--|
| **FR-LRN-01** | Điều hướng giữa các chương và tiếp tục học | Học viên điều hướng giữa các chương và tiếp tục theo tiến độ đã lưu. Khách điều hướng, đọc chương Public của khóa Public nhưng không có chức năng tiếp tục từ tiến độ cá nhân. | Học viên, Khách |
| **FR-LRN-02** | Đánh dấu bookmark | Đánh dấu bookmark tại một chương; mỗi khóa chỉ có một bookmark; hiển thị ở danh sách bookmark cá nhân. | Học viên |
| **FR-LRN-03** | Theo dõi tiến độ học tập | Hiển thị phần trăm hoàn thành theo chương và theo khóa, cùng lần học gần nhất; tính theo mục 3.4.1. | Học viên, Hệ thống |
| **FR-LRN-04** | Bắt đầu làm bài kiểm tra | Học viên bắt đầu làm bài kiểm tra khi đủ điều kiện (`FR-CNT-14`). | Học viên |
| **FR-LRN-05** | Theo dõi câu đã làm/chưa làm | Trong khi làm bài, theo dõi câu đã làm và chưa làm. | Học viên |
| **FR-LRN-06** | Theo dõi thời gian làm bài | Theo dõi thời gian còn lại (tính theo thời gian server). | Học viên |
| **FR-LRN-07** | Truy cập trực tiếp câu hỏi | Chuyển thẳng đến câu hỏi bất kỳ qua danh sách điều hướng. | Học viên |
| **FR-LRN-08** | Nộp bài kiểm tra | Học viên chủ động nộp; hệ thống tự động nộp khi hết giờ. | Học viên, Hệ thống |
| **FR-LRN-09** | Làm và nộp bài tập | Hỗ trợ tự lưu và nộp bài tập. | Học viên, Hệ thống |
| **FR-LRN-10** | Bình luận | Bình luận theo chương hoặc theo khóa; hiển thị thời gian đăng. Học viên Đang học và Chủ khóa được bình luận. Nội dung bình luận được AI quét (`FR-AI-03`). | Học viên, Chủ khóa |
| **FR-LRN-11** | Trả lời bình luận | Trả lời bình luận, lồng nhau một cấp. | Học viên, Chủ khóa |
| **FR-LRN-12** | Sửa và xóa bình luận của mình | Người đăng sửa hoặc xóa (xóa mềm) bình luận của chính mình. | Học viên, Chủ khóa |
| **FR-LRN-13** | Ghim bình luận | Chỉ Chủ khóa được ghim/bỏ ghim bình luận trong khóa của mình. | Chủ khóa |
| **FR-LRN-14** | Báo cáo bình luận | Báo cáo bình luận vi phạm (xem `FR-MOD-01`). | Học viên, Chủ khóa |
| **FR-LRN-15** | Kiểm tra quyền truy cập học tập | Hoạt động học tập có ghi nhận danh tính/kết quả chỉ được thực hiện khi người dùng ở trạng thái Đang học và qua kiểm tra quyền khóa – chương (mục 3.2.2). | Học viên, Hệ thống |
| **FR-LRN-16** | Truy cập nội dung với tư cách Khách | Không cần đăng nhập để đọc khi khóa Public và chương Public. Không cấp quyền cho khóa Private/Only Me, chương Protected, khóa tạm ẩn hoặc đã xóa. Không lưu tiến độ, bookmark, điểm, bài nộp. | Khách, Hệ thống |

#### 3.4.1. Quy tắc hoàn thành và tiến độ

Chỉ ghi nhận cho Học viên Đang học; không ghi nhận cho Khách.

| Đối tượng | Hoàn thành khi |
|:--|:--|
| Block nội dung (rich text, hình ảnh, video, âm thanh, file, markdown, flashcard) | Học viên **đã mở** Block (kể cả video và âm thanh, không yêu cầu xem hết). |
| Block câu hỏi | Học viên **đã làm** (đã gửi câu trả lời, đúng hoặc sai). |
| Block bài tập | Đã **nộp**. |
| Block bài kiểm tra | Đã **nộp** (không cần đạt ngưỡng). |
| **Chương** | **Mọi Block đã đăng tải** của chương đều hoàn thành. Chương Nháp không được tính. Chương không có Block đã đăng tải không tính vào tỷ lệ. |
| **Khóa học** | **100% chương đã đăng tải** đều hoàn thành. |

**Công thức hiển thị**
- Tiến độ chương (%) = số Block hoàn thành / số Block đã đăng tải của chương.
- Tiến độ khóa (%) = số chương hoàn thành / số chương đã đăng tải.

**Trạng thái "đã hoàn thành" khóa học** được ghi nhận kèm thời điểm và **không bị hủy** khi Chủ khóa thêm chương mới hoặc đăng tải thêm Block; khi đó chỉ tỷ lệ hiển thị giảm. Số "học viên đã hoàn thành" ở `FR-CRS-14` đếm theo trạng thái đã ghi nhận này.

**Hoàn thành khóa ≠ đạt chuẩn đầu ra.** Hoàn thành khóa chỉ phản ánh mức độ đã học qua nội dung (tiến độ). Đạt chuẩn đầu ra của khóa yêu cầu mức đạt từng CLO không thấp hơn ngưỡng đạt (mục 3.5.2). Hai trạng thái độc lập: học viên có thể hoàn thành khóa nhưng chưa đạt chuẩn đầu ra, và ngược lại.

---

### 3.5. Assessment Module

| Mã YC | Tên chức năng | Đặc tả | Tác nhân |
|:--|:--|:--|:--|
| **FR-AST-01** | Lưu kết quả và lịch sử làm bài | Lưu kết quả từng lần làm bài kiểm tra và lịch sử làm bài. | Hệ thống |
| **FR-AST-02** | Lưu điểm cao nhất, gần nhất, trung bình | Lưu điểm cao nhất, gần nhất, trung bình, gắn với từng khóa và từng học viên. | Hệ thống |
| **FR-AST-03** | Chấm tay tự luận và bài tập | Chủ khóa chấm tay câu tự luận và bài tập đã nộp. | Chủ khóa |
| **FR-AST-04** | Nhận xét | Chủ khóa ghi nhận xét; hiển thị dưới bài làm hoặc ở thanh tab của bài làm. | Chủ khóa, Học viên |
| **FR-AST-05** | Bảng điểm theo học viên | Bảng điểm của học viên gồm điểm các thành phần, điểm tổng kết, xếp loại và mức đạt từng CLO. | Chủ khóa, Học viên |
| **FR-AST-06** | Bảng điểm theo bài kiểm tra | Bảng điểm riêng của từng bài kiểm tra. | Chủ khóa, Học viên |
| **FR-AST-07** | Quy tắc tính điểm tổng kết | Thiết lập mặc định cho khóa: trọng số từng bài kiểm tra/bài tập, và điểm lấy của bài nhiều lần làm (cao nhất, gần nhất hoặc trung bình). | Chủ khóa |
| **FR-AST-08** | Ngưỡng đạt chung | Một ngưỡng đạt chung cho cả khóa (mặc định 50%), dùng cho điểm tổng kết và mọi CLO/PLO. Không có ngưỡng riêng từng mục tiêu. | Chủ khóa |
| **FR-AST-09** | Xếp loại học lực | Xếp loại điểm tổng kết theo mẫu: trượt/yếu/kém/khá/giỏi/xuất sắc, hoặc F/D/C/B/A, hoặc tùy biến. | Chủ khóa |
| **FR-AST-10** | Khai báo CLO | Chủ khóa khai báo danh sách CLO của khóa: mã, nội dung mô tả, mức Bloom. | Chủ khóa |
| **FR-AST-11** | Thang mức Bloom linh hoạt | Chủ khóa chọn thang cho khóa: Bloom 6 mức (Nhớ, Hiểu, Vận dụng, Phân tích, Đánh giá, Sáng tạo), thang số 1–5, hoặc tự đặt số mức và tên mức. | Chủ khóa |
| **FR-AST-12** | PLO tùy chọn | Chủ khóa tự chọn bật/tắt tầng PLO cho khóa. Khi bật, Chủ khóa tự khai báo PLO và gắn mỗi CLO vào một hoặc nhiều PLO. Khi tắt, chỉ dùng CLO. | Chủ khóa |
| **FR-AST-13** | Liên kết bài kiểm tra/bài tập với CLO | Mỗi bài kiểm tra hoặc bài tập được gắn vào một hoặc nhiều CLO kèm trọng số đóng góp cho từng CLO. | Chủ khóa |
| **FR-AST-14** | Phân mức đạt CLO tùy biến | Chủ khóa định nghĩa các mức đạt (tên và mốc %). Mặc định: Chưa đạt (< ngưỡng), Đạt (ngưỡng – <70%), Tốt (70 – <85%), Xuất sắc (≥ 85%). | Chủ khóa |
| **FR-AST-15** | Tính mức đạt CLO/PLO của học viên | Hệ thống tính theo mục 3.5.2 và hiển thị mức đạt từng CLO (và PLO nếu bật), kèm đóng góp của từng bài kiểm tra/bài tập. | Hệ thống |
| **FR-AST-16** | Thống kê dành cho Chủ khóa | Phân bố điểm; câu hỏi khó/dễ; tỷ lệ học viên đạt từng CLO (và PLO nếu bật); phân bố mức đạt. | Chủ khóa |
| **FR-AST-17** | Đánh giá khóa học | Chấm sao (1–5) và nhận xét. Chỉ học viên Đang học được đánh giá; mỗi người một đánh giá mỗi khóa, được sửa. | Học viên |
| **FR-AST-18** | Trả lời đánh giá | Chủ khóa trả lời đánh giá của học viên. | Chủ khóa |
| **FR-AST-19** | Hiển thị điểm đánh giá trung bình | Hiển thị điểm sao trung bình và số lượt đánh giá. | Hệ thống |
| **FR-AST-20** | Xuất báo cáo | Xuất bảng điểm, mức đạt CLO/PLO và thống kê ra Excel hoặc PDF. | Chủ khóa |

#### 3.5.1. Chuẩn đầu ra theo AUN-QA

Hệ thống chỉ hỗ trợ khung chuẩn đầu ra theo AUN-QA, không có chuẩn tùy biến khác.

1. **CLO** (Course Learning Outcome): chuẩn đầu ra cấp khóa học, bắt buộc, mỗi CLO có mức Bloom.
2. **PLO** (Programme Learning Outcome): chuẩn đầu ra cấp chương trình, **tùy chọn**, do Chủ khóa tự khai báo; mỗi CLO có thể gắn với một hoặc nhiều PLO.
3. **Thành phần đánh giá:** bài kiểm tra và bài tập. Mỗi thành phần gắn vào một hoặc nhiều CLO kèm trọng số.
4. Hệ thống không có rubric chi tiết và không có ngưỡng đạt riêng từng mục tiêu.

#### 3.5.2. Cách tính mức đạt CLO

- Với mỗi thành phần *i* gắn vào CLO *k*: tỷ lệ đạt *tᵢ* = điểm học viên / điểm tối đa của thành phần (điểm theo quy tắc `FR-AST-07`).
- Mức đạt CLO *k* (%) = Σ(*wᵢₖ* · *tᵢ*) / Σ *wᵢₖ* × 100, với *wᵢₖ* là trọng số của thành phần *i* cho CLO *k*.
- Thành phần đã đóng/quá hạn mà học viên chưa làm tính 0 điểm; thành phần chưa đến hạn chưa được tính.
- **Đạt CLO** khi mức đạt ≥ ngưỡng đạt chung (`FR-AST-08`). Tên mức (Tốt, Xuất sắc...) lấy theo `FR-AST-14`.
- Mức đạt PLO (nếu bật) = trung bình có trọng số đều của các CLO gắn với PLO đó; đạt PLO khi ≥ ngưỡng.
- **Đạt chuẩn đầu ra của khóa** khi mọi CLO đều đạt.

---

### 3.6. Discovery Module

| Mã YC | Tên chức năng | Đặc tả | Tác nhân |
|:--|:--|:--|:--|
| **FR-DSC-01** | Khóa học mới cập nhật | Trang chủ hiển thị khóa mới cập nhật đủ điều kiện công khai. | Khách, Người dùng |
| **FR-DSC-02** | Khóa học đề xuất | Trang chủ hiển thị danh sách khóa học đề xuất đủ điều kiện công khai, chọn **ngẫu nhiên** từ toàn bộ khóa học đủ điều kiện hiển thị trên hệ thống. Mỗi lần tải trang tạo một danh sách mới, độc lập giữa từng người dùng; không dựa trên lịch sử học tập. | Khách, Người dùng |
| **FR-DSC-03** | Khóa học đang học dở | Trang chủ hiển thị khóa học viên đang học dở. | Học viên |
| **FR-DSC-04** | Tìm kiếm khóa học | Tìm theo tên khóa và theo Chủ khóa, trong phạm vi dữ liệu công khai. | Khách, Người dùng |
| **FR-DSC-05** | Lịch sử tìm kiếm | Lưu và hiển thị lịch sử tìm kiếm. | Người dùng |
| **FR-DSC-06** | Lọc theo tag | Lọc theo tag. | Khách, Người dùng |
| **FR-DSC-07** | Lọc theo chế độ truy cập | Lọc theo Public / Private trong phạm vi thông tin công khai. | Khách, Người dùng |
| **FR-DSC-08** | Lọc theo trạng thái khóa học | Lọc theo trạng thái khóa (Đang cập nhật, Đã hoàn thành, Tạm dừng). | Khách, Người dùng |
| **FR-DSC-09** | Sắp xếp khóa học | Theo: (1) mới cập nhật; (2) mới ra mắt (khóa có từ 1 chương đã đăng tải, từ gần nhất); (3) số lượt đánh giá; (4) số lượt đề cử; (5) số học viên; (6) lượt bình luận. | Khách, Người dùng |
| **FR-DSC-10** | Top 10 khóa học | Bảng xếp hạng Top 10 theo tuần này, tháng này hoặc toàn thời gian, gồm: nhiều học viên nhất, nhiều lượt đánh giá nhất, nhiều lượt đề cử nhất. Với tuần/tháng, tính theo số phát sinh trong kỳ (ghi danh mới, đánh giá mới, đề cử mới). Không có Top doanh thu, Top giảng viên, Top học viên. | Khách, Người dùng |

#### 3.6.1. Quy tắc hiển thị

Discovery chỉ hiển thị khóa học đủ điều kiện công khai. Khóa Only Me, Tạm ẩn, Đã xóa **không** xuất hiện trong bất kỳ kết quả Discovery nào. Khóa Private chỉ hiển thị thông tin cơ bản (tên, mô tả, ảnh bìa, Chủ khóa, tag); nội dung vẫn phải qua kiểm tra quyền.

---

### 3.7. Profile Module

| Mã YC | Tên chức năng | Đặc tả | Tác nhân |
|:--|:--|:--|:--|
| **FR-PRF-01** | Cập nhật tên hiển thị | Đặt và cập nhật tên hiển thị. | Người dùng |
| **FR-PRF-02** | Cập nhật avatar | Đặt và cập nhật avatar. | Người dùng |
| **FR-PRF-03** | Cập nhật giới thiệu | Viết phần giới thiệu; mặc định hồ sơ công khai hiển thị ngày gia nhập hệ thống. | Người dùng |
| **FR-PRF-04** | Thiết lập quyền riêng tư | Ẩn/hiện danh sách khóa học trên hồ sơ công khai. | Người dùng |
| **FR-PRF-05** | Danh sách khóa học cá nhân | Hiển thị khóa đã ghi danh, đã tạo, đã hoàn thành. | Người dùng |
| **FR-PRF-06** | Trang hồ sơ công khai | Trang hồ sơ công khai; khóa Only Me không bao giờ hiển thị. | Khách, Người dùng |
| **FR-PRF-07** | Cài đặt giao diện | Cài đặt giao diện (ví dụ sáng/tối). | Người dùng |

---

### 3.8. Notification Module

| Mã YC | Tên chức năng | Đặc tả | Tác nhân |
|:--|:--|:--|:--|
| **FR-NTF-01** | Tạo thông báo từ domain event | Tạo thông báo từ domain event: lời mời/duyệt tham gia, ghi danh, bình luận mới/trả lời, điểm và nhận xét, chương mới, kết quả xử lý báo cáo, chế tài. Gửi sau khi nghiệp vụ chính hoàn thành; lỗi gửi không làm rollback nghiệp vụ chính. | Hệ thống |
| **FR-NTF-02** | Thông báo trong ứng dụng | Lưu vào cơ sở dữ liệu và hiển thị ở biểu tượng chuông; dùng cho mọi thông báo. | Hệ thống, Người dùng |
| **FR-NTF-03** | Thông báo qua email | Gửi email cho: xác minh email, đặt lại mật khẩu, khóa tài khoản. | Hệ thống |
| **FR-NTF-04** | Xem danh sách thông báo | Hiển thị danh sách thông báo của người dùng. | Người dùng |
| **FR-NTF-05** | Đánh dấu đã đọc | Đánh dấu từng thông báo hoặc tất cả. | Người dùng |
| **FR-NTF-06** | Xóa thông báo | Xóa thông báo. | Người dùng |
| **FR-NTF-07** | Thông báo hệ thống (broadcast) | Admin gửi thông báo hệ thống tới người dùng. | Admin |

---

### 3.9. Moderation Module

| Mã YC | Tên chức năng | Đặc tả | Tác nhân |
|:--|:--|:--|:--|
| **FR-MOD-01** | Gửi báo cáo vi phạm | Báo cáo khóa học hoặc bình luận mà mình có quyền truy cập: chọn lý do, nhập mô tả, đính kèm ảnh/link bằng chứng. Khóa Only Me không thể bị báo cáo. | Học viên, Chủ khóa |
| **FR-MOD-02** | Chống báo cáo spam | Chặn nhiều báo cáo trùng lặp từ một tài khoản lên cùng một đối tượng trong thời gian ngắn. | Hệ thống |
| **FR-MOD-03** | Quản lý hàng đợi báo cáo | Gom báo cáo của người dùng và cờ vi phạm từ AI (`FR-AI-03`) vào một hàng đợi; lọc theo nguồn (người dùng/AI), loại đối tượng, trạng thái. | Admin |
| **FR-MOD-04** | Xử lý báo cáo | Admin thẩm định và quyết định **Chấp nhận** (xác nhận vi phạm, kèm chế tài tại mục 3.9.1) hoặc **Từ chối**; bắt buộc nhập lý do. Quyết định là cuối cùng, không có kháng nghị. Trạng thái báo cáo: Chờ xử lý, Đã chấp nhận, Đã từ chối. | Admin |
| **FR-MOD-05** | Gửi thông báo kết quả | Gửi kết quả và lý do cho người báo cáo và người bị báo cáo qua Notification. Báo cáo do AI tạo chỉ thông báo cho người bị xử lý. | Hệ thống |
| **FR-MOD-06** | Xóa bình luận vi phạm | Xóa mềm bình luận; các trả lời lồng bên trong bị ẩn theo. | Admin |
| **FR-MOD-07** | Tạm ẩn khóa học | Tạm ẩn khóa vi phạm, lưu lý do; có thể kèm thời hạn. Không áp dụng cho khóa Only Me. | Admin |
| **FR-MOD-08** | Khôi phục khóa học | Mở lại khóa về trạng thái trước khi ẩn: Admin khôi phục thủ công, hoặc tự động khi hết thời hạn (nếu có). | Admin, Hệ thống |
| **FR-MOD-09** | Xóa vĩnh viễn khóa học | Xóa vĩnh viễn khóa vi phạm nghiêm trọng (dữ liệu và tệp trên lưu trữ); yêu cầu xác nhận thao tác và ghi audit log. | Admin |
| **FR-MOD-10** | Khóa tài khoản có thời hạn | Khóa đăng nhập tài khoản có thời hạn kèm lý do; tự động mở khi hết hạn. Gửi lệnh sang Identity cập nhật trạng thái. | Admin, Hệ thống |
| **FR-MOD-11** | Khóa tài khoản vĩnh viễn | Vô hiệu hóa vĩnh viễn tài khoản vi phạm đặc biệt nghiêm trọng. | Admin |
| **FR-MOD-12** | Mở khóa tài khoản | Gỡ khóa tài khoản trước hạn hoặc gỡ khóa vĩnh viễn, kèm lý do. | Admin |
| **FR-MOD-13** | Ghi audit log | Ghi log bất biến cho mọi thao tác xử lý: người thực hiện, thời gian, đối tượng, hành động, lý do. | Hệ thống |
| **FR-MOD-14** | Xem audit log | Admin tra cứu, lọc toàn bộ audit log. | Admin |
| **FR-MOD-15** | Dashboard kiểm duyệt | Tổng quan: số báo cáo chờ xử lý, số cờ AI chờ xử lý, danh sách tài khoản đang bị khóa, khóa học đang bị tạm ẩn. | Admin |

#### 3.9.1. Chế tài

Mọi chế tài đều: **bắt buộc có lý do**, được ghi audit log, và thông báo cho đối tượng bị xử lý. Không có cảnh cáo, cấm bình luận, cấm tạo khóa học hay đóng băng ví.

| Chế tài | Đối tượng | Thời hạn | Tác động | Gỡ |
|:--|:--|:--|:--|:--|
| **Xóa bình luận** | Bình luận | Không | Bình luận bị xóa mềm; các trả lời bên trong bị ẩn. | Admin khôi phục từ xóa mềm. |
| **Tạm ẩn khóa học** | Khóa học (trừ Only Me) | Tùy chọn | Khóa không hiển thị ở Discovery và người dùng khác không truy cập được; Chủ khóa vẫn xem và sửa; học viên đã ghi danh tạm mất quyền truy cập, tiến độ được giữ. | Admin khôi phục, hoặc tự động khi hết thời hạn. |
| **Khóa tài khoản có thời hạn** | Tài khoản | Bắt buộc (do Admin nhập) | Không đăng nhập được, mọi phiên bị thu hồi, API xác thực bị chặn. Khóa học của tài khoản đó **không bị ẩn** và vẫn hiển thị bình thường. | Tự động khi hết hạn, hoặc Admin mở sớm. |
| **Khóa tài khoản vĩnh viễn** | Tài khoản | Không giới hạn | Như trên, không tự gỡ. | Chỉ Admin mở khóa thủ công. |
| **Xóa vĩnh viễn khóa học** | Khóa học | Không | Xóa hoàn toàn dữ liệu và tệp; không khôi phục được. Khóa phải ở trạng thái Đã xóa hoặc Tạm ẩn trước đó; cần xác nhận. | Không. |

Admin không tự khóa chính mình và không khóa Admin cuối cùng.

#### 3.9.2. Quy trình xử lý và luồng giao tiếp

1. **Tiếp nhận:** báo cáo của người dùng hoặc cờ vi phạm từ AI vào hàng đợi tập trung. AI không tự ẩn, xóa hay xử phạt.
2. **Xử lý:** Admin thẩm định, quyết định Chấp nhận/Từ chối và nhập lý do.
3. **Thực thi liên module:**
   - Khóa tài khoản: Moderation phát lệnh sang Identity; Identity ghi nhận loại, thời hạn, lý do và tự gỡ khi hết hạn.
   - Tạm ẩn/xóa khóa học: đồng bộ sang Course và Discovery để gỡ khỏi giao diện.
   - Kết quả xử lý: gửi qua Notification.

---

### 3.10. AI Module

| Mã YC | Tên chức năng | Đặc tả | Tác nhân |
|:--|:--|:--|:--|
| **FR-AI-01** | Sinh câu hỏi trắc nghiệm | Chủ khóa cung cấp đầu vào (văn bản dán vào hoặc chọn nội dung chương của khóa mình), số lượng và độ khó. AI tạo câu hỏi trắc nghiệm (một hoặc nhiều đáp án). Kết quả luôn ở trạng thái **Nháp – do AI tạo** trong ngân hàng câu hỏi; chỉ dùng được sau khi Chủ khóa xem, chỉnh sửa và duyệt (chuyển Sẵn sàng). | Chủ khóa, Hệ thống |
| **FR-AI-02** | Sinh flashcard | AI trích xuất thuật ngữ và định nghĩa cốt lõi từ đầu vào như `FR-AI-01` để tạo bộ flashcard 2 mặt. Kết quả luôn ở trạng thái Nháp; Chủ khóa duyệt trước khi đăng tải. | Chủ khóa, Hệ thống |
| **FR-AI-03** | Quét nội dung vi phạm | Mô hình PhoBERT fine-tune chạy cục bộ (dịch vụ Python) quét **bình luận**, **tên khóa học**, **giới thiệu khóa học** khi tạo hoặc sửa. Nội dung vượt ngưỡng được gắn cờ và chuyển vào hàng đợi báo cáo (`FR-MOD-03`, nguồn AI). Việc quét chạy sau khi lưu, không chặn người dùng đăng nội dung; nếu dịch vụ lỗi thì bỏ qua và ghi log. Không quét khóa Only Me. Admin cấu hình ngưỡng gắn cờ. | Hệ thống |

#### 3.10.1. Nguyên tắc triển khai

1. **Human-in-the-loop:** nội dung AI sinh ra không tự xuất bản; mọi quyết định xử lý vi phạm do Admin thực hiện.
2. **Kiến trúc kết hợp:**
   - *PhoBERT fine-tune cục bộ:* quét vi phạm (`FR-AI-03`), không tốn phí API.
   - *LLM API ngoài:* sinh câu hỏi và flashcard (`FR-AI-01`, `FR-AI-02`).
3. **Phạm vi dữ liệu:** AI sinh nội dung chỉ nhận văn bản Chủ khóa dán vào hoặc nội dung chương thuộc khóa của chính Chủ khóa; chưa hỗ trợ tải lên tệp PDF. Dữ liệu chỉ gửi ra LLM ngoài khi Chủ khóa chủ động yêu cầu.
4. **Hạn mức:** số lượt gọi LLM mỗi ngày cho mỗi người dùng cố định (Admin cấu hình); hết lượt thì chặn và thông báo. Không có phân gói.
5. Các chức năng AI khác (tóm tắt, dàn ý, RAG, rào chắn chống ảo giác, gợi ý chấm, gợi ý cá nhân hóa, smart routing, semantic cache) **không** thuộc phạm vi.

---

## 4. MA TRẬN PHÂN QUYỀN

Ký hiệu: ✓ được phép; — không; ✓* có điều kiện (ghi chú).

| Nhóm | Thao tác | Khách | Học viên | Chủ khóa | Admin |
|:--|:--|:-:|:-:|:-:|:-:|
| Khám phá | Xem Discovery, thông tin công khai khóa | ✓ | ✓ | ✓ | ✓ |
| Nội dung | Đọc chương Public của khóa Public | ✓ | ✓ | ✓ | ✓* |
| Nội dung | Đọc chương Protected | — | ✓* | ✓ | ✓* |
| Nội dung | Đọc khóa Private | — | ✓* | ✓ | ✓* |
| Nội dung | Truy cập khóa Only Me | — | — | ✓ | — |
| Khóa học | Tạo / sửa / xóa mềm khóa học | — | — | ✓ | — |
| Khóa học | Đặt chế độ truy cập khóa và chương | — | — | ✓ | — |
| Ghi danh | Tự ghi danh / hủy ghi danh | — | ✓ | — | — |
| Ghi danh | Mời, duyệt, xóa học viên | — | — | ✓ | — |
| Học tập | Lưu tiến độ, bookmark, làm và nộp bài | — | ✓* | — | — |
| Bình luận | Bình luận, trả lời, sửa/xóa của mình | — | ✓* | ✓ | — |
| Bình luận | Ghim bình luận | — | — | ✓ | — |
| Đánh giá | Đề cử khóa học | — | ✓* | ✓ | — |
| Đánh giá | Đánh giá khóa học | — | ✓* | — | — |
| Đánh giá | Chấm bài, nhận xét, thiết lập CLO/PLO | — | — | ✓ | — |
| AI | Sinh quiz/flashcard | — | — | ✓ | — |
| Báo cáo | Gửi báo cáo vi phạm | — | ✓* | ✓* | ✓ |
| Kiểm duyệt | Xem hàng đợi, chấp nhận/từ chối báo cáo | — | — | — | ✓ |
| Kiểm duyệt | Xóa bình luận, tạm ẩn/khôi phục khóa | — | — | — | ✓ |
| Chế tài | Khóa tài khoản có thời hạn / vĩnh viễn, mở khóa | — | — | — | ✓ |
| Dữ liệu | Xóa vĩnh viễn khóa học | — | — | — | ✓ |
| Quản trị | Quản lý người dùng và role Admin | — | — | — | ✓ |
| Giám sát | Xem audit log, dashboard | — | — | — | ✓ |
| Cấu hình | Ngưỡng AI, hạn mức AI, broadcast, tham số hệ thống | — | — | — | ✓ |

Ghi chú:
- Học viên ✓*: phải ở trạng thái Đang học; chương Protected cần nhập đúng passcode; khóa Private cần được mời/duyệt.
- Admin ✓* đọc nội dung: chỉ trong phạm vi xử lý báo cáo/kiểm duyệt và không bao giờ với khóa Only Me.
- Báo cáo ✓*: chỉ với đối tượng mà người báo cáo có quyền truy cập.
- Chủ khóa là quan hệ với từng khóa học, không phải role tài khoản.

---

## 5. ĐẶC TẢ YÊU CẦU PHI CHỨC NĂNG (NFR)

| Mã | Nhóm | Yêu cầu / tiêu chí nghiệm thu |
|:--|:--|:--|
| **NFR-01** | Hiệu năng | 95% yêu cầu đọc (danh sách khóa học, trang học, tìm kiếm) ≤ 2 giây; 95% yêu cầu ghi (nộp bài, bình luận, ghi danh) ≤ 3 giây ở mức 50 người dùng đồng thời. |
| **NFR-02** | Chịu tải | Hỗ trợ ít nhất 50 người dùng đồng thời; tỷ lệ lỗi HTTP 5xx < 1% trong kiểm thử liên tục 15 phút. |
| **NFR-03** | Tải trang | Trang chủ và trang học tập đạt Lighthouse Performance ≥ 70 ở chế độ mô phỏng mobile. Mọi API danh sách phải phân trang, tối đa 50 bản ghi/trang. |
| **NFR-04** | Xác thực | Các API, ngoại trừ đăng nhập, đăng ký và xem công khai, phải yêu cầu JWT. Access token sống ≤ 30 phút; refresh token có thể thu hồi. Mật khẩu băm BCrypt; không lưu plaintext, không ghi log mật khẩu/token. |
| **NFR-05** | Phân quyền | Backend kiểm tra quyền cho mọi API. Chỉ Chủ khóa sửa khóa của mình. Chỉ Chủ khóa truy cập khóa Only Me, kể cả Admin. Quyền truy cập chương không vượt giới hạn khóa cha. Khách không cần đăng nhập để xem Discovery và chỉ đọc khi khóa Public và chương Public; không truy cập khóa Private/Only Me, chương Protected, khóa tạm ẩn/đã xóa và không được ghi nhận dữ liệu học tập. Người dùng chỉ xem nội dung khi có quyền học hợp lệ. Tài khoản bị khóa bị chặn ngay. |
| **NFR-06** | Truyền dữ liệu an toàn | Production dùng HTTPS/TLS, tự chuyển HTTP sang HTTPS, bật HSTS. Nếu dùng cookie: Secure, HttpOnly, SameSite=Strict; thao tác thay đổi dữ liệu có biện pháp chống CSRF phù hợp. |
| **NFR-07** | Chống tấn công phổ biến | Chống SQL Injection bằng truy vấn tham số hóa; làm sạch HTML rich text/bình luận ở server để giảm XSS; CORS chỉ cho domain hệ thống. Giới hạn đăng nhập tối đa 5 lần/phút/IP; rate limit cho bình luận, báo cáo và AI. |
| **NFR-08** | Tệp tải lên | Chỉ nhận định dạng cho phép (gồm .zip) và kiểm tra cả nội dung thực tế của tệp, không chỉ phần mở rộng/MIME do client gửi. Ảnh ≤ 5 MB; tệp đính kèm ≤ 20 MB. Tệp thuộc khóa Private, chương Protected hoặc khóa Only Me không được truy cập công khai khi chưa có quyền. |
| **NFR-09** | Toàn vẹn dữ liệu | Ghi danh, nộp bài, chấm điểm, tính tiến độ/CLO và tạo sự kiện liên quan dùng transaction/outbox hoặc cơ chế nhất quán phù hợp; lỗi giữa chừng không để trạng thái dở dang. |
| **NFR-10** | Bài làm không mất | Bài kiểm tra tự lưu tối đa mỗi 30 giây. Khi tải lại trang/mất mạng, khôi phục bài làm đã lưu gần nhất. Đồng hồ đếm giờ dựa trên thời gian server. |
| **NFR-11** | Xóa mềm | Khóa học và bình luận dùng xóa mềm để khôi phục; khóa học bị xóa mềm được xem như tạm ẩn với người dùng thông thường. Chỉ Admin được xóa vĩnh viễn và mọi thao tác xóa vĩnh viễn phải có audit log. |
| **NFR-12** | Truy vết | Lưu người thực hiện, thời gian và lý do cho thao tác quản trị (khóa/mở khóa tài khoản, ẩn/khôi phục/xóa khóa học, xử lý báo cáo) và thay đổi điểm. Log không chứa mật khẩu/token. |
| **NFR-13** | Chất lượng AI | Nội dung AI sinh ở trạng thái "Nháp – do AI tạo", chỉ xuất bản sau khi Chủ khóa duyệt. AI không tự xử lý vi phạm: chỉ gắn cờ vào hàng đợi cho Admin. Khóa Only Me không bị quét kiểm duyệt dưới bất kỳ hình thức nào. |
| **NFR-14** | Sẵn sàng | Uptime mục tiêu ≥ 99%/tháng, không tính bảo trì đã báo trước. Container tự khởi động lại khi lỗi; có endpoint `/health`. |
| **NFR-15** | Sao lưu / phục hồi | Backup MySQL hằng ngày, giữ 7 bản; RPO ≤ 24 giờ, RTO ≤ 4 giờ. Có tài liệu khôi phục và đã thử khôi phục thành công ít nhất một lần. |
| **NFR-16** | Bảo trì | Hệ thống chia thành 10 module theo nghiệp vụ, mỗi module sở hữu bảng/dữ liệu riêng. Module chỉ giao tiếp qua Contract công khai (đồng bộ) hoặc domain event (bất đồng bộ), không tham chiếu implementation/bảng nội bộ của module khác. |
| **NFR-17** | Kiểm thử | Unit test ≥ 60% coverage cho Domain/Application của Identity, Learning, Assessment; integration test cho ghi danh, chấm bài, phân quyền (khóa/chương), tính tiến độ và mức đạt CLO; E2E cho ba luồng: đăng ký/đăng nhập, ghi danh và học khóa học, làm bài kiểm tra. |
| **NFR-18** | Mở rộng | Thêm tính năng mới không phải sửa trực tiếp dữ liệu nội bộ hoặc implementation của module không liên quan; thay đổi liên module qua Contract/event đã công bố. |
| **NFR-19** | Tương thích | Hỗ trợ Chrome, Edge, Firefox và trình duyệt di động hiện đại. Giao diện dùng tốt từ chiều rộng 360 px. |
| **NFR-20** | Khả dụng | Lỗi bằng tiếng Việt, chỉ rõ trường sai; giữ dữ liệu biểu mẫu khi lỗi validation/conflict; thao tác dài có trạng thái đang xử lý/thành công/thất bại; thao tác nguy hiểm (xóa khóa, khóa tài khoản) có xác nhận. |
| **NFR-21** | Triển khai | Docker Compose một lệnh trên máy cá nhân và VPS Linux. Secrets qua biến môi trường/secret store, không commit. Jenkins CI/CD chạy test và triển khai khi merge vào `main`. |
| **NFR-22** | Dịch vụ bên ngoài | Dịch vụ AI, email, OAuth, dịch vụ PhoBERT có timeout và xử lý lỗi; timeout LLM 30 giây, dịch vụ ngoài còn lại 10 giây. Lỗi dịch vụ ngoài không làm mất dữ liệu hoặc sập chức năng khác. |