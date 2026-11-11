# Handoff Note – T-S0-OPS-03

- **Task:** `T-S0-OPS-03` – `tools/merge-openapi` + Redocly lint + sinh `openapi/openapi.yaml`
- **Vai trò:** OPS
- **Nhánh:** `feat/T-S0-OPS-03-merge-openapi`
- **Trạng thái:** DONE

## Đã thực hiện

1. **Thiết lập pnpm workspace & package `tools`:**
   - [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) & [`package.json`](../../package.json): cấu hình pnpm workspace với package `'tools'` (ghim `packageManager: pnpm@12.18.0`), giữ nguyên không thêm `'frontend'` trước task `T-S0-FE-01`.
   - [`tools/package.json`](../../tools/package.json) & [`pnpm-lock.yaml`](../../pnpm-lock.yaml): cài `yaml` (`^2.9.1`) và `@redocly/cli` (`^2.77.0`), cung cấp các script `openapi:bundle`, `openapi:check`, `openapi:lint`, và `test`.

2. **Script gộp OpenAPI (`tools/merge-openapi`):**
   - [`tools/merge-openapi/merge.mjs`](../../tools/merge-openapi/merge.mjs): hàm `mergeOpenApi(...)` đọc [`openapi/openapi.root.yaml`](../../openapi/openapi.root.yaml) và toàn bộ `openapi/modules/*.yaml` theo thứ tự ASCII cố định bằng `YAML.parse(..., { uniqueKeys: true })`, gộp vào [`openapi/openapi.yaml`](../../openapi/openapi.yaml) với header cảnh báo không sửa tay.
   - Ràng buộc an toàn khi gộp (lỗi thoát non-zero):
     - Trùng key ngay trong cùng file YAML (`uniqueKeys: true`).
     - Trùng đường dẫn `paths` giữa các file (`root` hoặc `modules/*.yaml`).
     - Trùng tên trong `components.schemas` hoặc bất kỳ nhóm `components.*` nào giữa các module hoặc đè lên `openapi.root.yaml`.
     - Trùng `operationId` giữa các operation.
     - `$ref` cục bộ dạng `#/components/<section>/<name>` trỏ tới thành phần không tồn tại.
     - Key cấp cao nhất lạ ngoài `paths` và `components` trong file module.
     - Chế độ `--check` phát hiện [`openapi/openapi.yaml`](../../openapi/openapi.yaml) bị thiếu hoặc lệch so với nguồn (`openapi.root.yaml` + `modules/*.yaml`).
   - [`tools/merge-openapi/index.mjs`](../../tools/merge-openapi/index.mjs): CLI chạy bundle mặc định hoặc kiểm tra đồng bộ với cờ `--check`.

3. **Cấu hình Redocly Lint & Bundled Spec:**
   - [`openapi/redocly.yaml`](../../openapi/redocly.yaml): kế thừa `recommended` và giữ mức `error` cho các rule cấu trúc/hợp lệ (`struct`, `no-unresolved-refs`, `operation-operationId-unique`, `no-identical-paths`, `no-ambiguous-paths`, `no-path-trailing-slash`, `path-params-defined`, `path-declaration-must-exist`, `operation-parameters-unique`). Tắt các rule phong cách/tài liệu không áp dụng cho bản đặc tả rút gọn nội bộ (`operation-4xx-response`, `no-unused-components` cho template dùng chung `components.responses.Problem` trong `openapi.root.yaml`, `info-license`, `tag-description`).
   - [`openapi/openapi.yaml`](../../openapi/openapi.yaml): sinh sạch từ **11** file module (**110** paths, **55** schemas) và commit vào repo theo `REPO_STRUCTURE.md §5`.

4. **Kiểm thử:**
   - [`tools/merge-openapi/merge-openapi.test.mjs`](../../tools/merge-openapi/merge-openapi.test.mjs): **11** unit test dùng `node:test` kiểm tra gộp thật toàn repo + `--check` CLI, và xác minh lỗi khi trùng `paths`, trùng `components.schemas`, trùng schema/parameter với `openapi.root.yaml`, trùng `operationId`, hỏng `$ref`, trùng key YAML nội bộ, sai top-level key ở module, và file bundle bị cũ (`--check`).

## Kết quả kiểm tra

- `corepack pnpm --filter tools openapi:bundle`: thành công (`Bundled openapi/openapi.yaml from 11 modules (110 paths, 55 schemas).`).
- `corepack pnpm --filter tools openapi:lint`: `redocly lint --config=../openapi/redocly.yaml ../openapi/openapi.yaml` đạt (`Woohoo! Your API description is valid.`), 0 error, 0 warning.
- `corepack pnpm --filter tools openapi:check`: thành công (`OpenAPI bundle is up to date (11 modules, 110 paths, 55 schemas).`).
- `corepack pnpm --filter tools test`: **11/11 passed**, 0 failed, 0 skipped.

## Điểm lệch hợp đồng / Ghi chú sửa `openapi/` & môi trường

- **Sửa 6 lỗi cú pháp YAML (`struct`) trong `openapi/modules/*.yaml`:** khi chạy `redocly lint` lần đầu, phát hiện 5 dòng `summary` đặt trong flow mapping `{...}` có dấu phẩy không bọc nháy nên parser YAML tách phần sau dấu phẩy thành property `null` trái chuẩn OpenAPI 3.0 trên Operation object. Đã bọc nháy đơn `'...'` giữ nguyên nguyên văn mô tả (không đổi path, method, schema hay `operationId`):
  - [`openapi/modules/content.yaml`](../../openapi/modules/content.yaml#L60): `getQuestionUsage` (`summary: 'Câu nằm trong bài nào, số lượt, tỷ lệ đúng (FR-CNT-08)'` — trước đó bị tách thành `số lượt: null` và `tỷ lệ đúng (FR-CNT-08): null`).
  - [`openapi/modules/course.yaml`](../../openapi/modules/course.yaml#L16): `getCourseStats` (`summary: 'Thống kê cơ bản (FR-CRS-14, Chủ khóa)'`).
  - [`openapi/modules/learning.yaml`](../../openapi/modules/learning.yaml#L20): `setBookmark` (`summary: 'Đặt bookmark (1/khóa, FR-LRN-02)'`).
  - [`openapi/modules/learning.yaml`](../../openapi/modules/learning.yaml#L60): `createComment` (`summary: 'Bình luận/trả lời (FR-LRN-10,11)'`).
  - [`openapi/modules/moderation.yaml`](../../openapi/modules/moderation.yaml#L13): `adminGetReport` (`summary: 'Chi tiết (kèm bằng chứng, URL ảnh Presigned)'`).
- **Môi trường Windows/Corepack:** trên máy chỉ có `corepack` mà chưa chạy `corepack enable pnpm` (vào thư mục `Program Files`), hãy dùng `corepack pnpm --filter tools ...` hoặc chạy `corepack enable pnpm` một lần trước khi dùng `pnpm --filter tools ...`.
- Không chỉnh sửa `backend/`, `frontend/`, `infra/` hoặc `contracts/`.
