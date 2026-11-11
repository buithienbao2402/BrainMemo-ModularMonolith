# Handoff Note – T-S0-BE-04

- **Task:** `T-S0-BE-04` – `Architecture.Tests` (NetArchTest) bảo đảm luật `REPO_STRUCTURE` §2
- **Vai trò:** BE
- **Nhánh:** `feat/T-S0-BE-04-architecture-tests`
- **Trạng thái:** REVIEW

## Đã thực hiện

1. **Dự án `backend/tests/Architecture.Tests/` ([`Architecture.Tests.csproj`](../../backend/tests/Architecture.Tests/Architecture.Tests.csproj)) & cập nhật [`BrainMemo.sln`](../../backend/BrainMemo.sln):**
   - Sử dụng `NetArchTest.Rules` (`1.3.2`), `Microsoft.CodeAnalysis.CSharp` (`4.8.0`), `Microsoft.EntityFrameworkCore.InMemory` / `Relational` (`9.0.2`), `xunit` (`2.9.3`). Xóa `.gitkeep`.

2. **Đặc tả & bộ nạp ([`Support/ModuleArchitectureSpec.cs`](../../backend/tests/Architecture.Tests/Support/ModuleArchitectureSpec.cs), [`Support/SolutionDiscovery.cs`](../../backend/tests/Architecture.Tests/Support/SolutionDiscovery.cs)):**
   - Khai báo đủ 10 module + prefix bảng (`Identity`→`idn_`, `Profile`→`prf_`, `Moderation`→`mod_`, `Notification`→`ntf_`, `Course`→`crs_`, `Content`→`cnt_`, `Learning`→`lrn_`, `Assessment`→`ast_`, `Discovery`→`dsc_`, `AI`→`ai_`) và ma trận phụ thuộc cho `SharedKernel`, `BuildingBlocks.Abstractions`, `BuildingBlocks.Infrastructure`, `WebApi`, và 5 lớp `Contracts`/`Domain`/`Application`/`Infrastructure`/`Api`.
   - Tự động phát hiện mọi `.csproj` trong `backend/src/` và mọi assembly `BrainMemo.*` (trừ `*.Tests`) để các module thêm ở S1+ được kiểm tra tự động ngay khi tạo.

3. **Bộ luật kiểm tra ([`Rules/`](../../backend/tests/Architecture.Tests/Rules/)):**
   - [`ArchitectureRuleRunner.cs`](../../backend/tests/Architecture.Tests/Rules/ArchitectureRuleRunner.cs): chạy `NetArchTest.Rules` (`HaveDependencyOnAny`, `MeetCustomRule`) và kiểm tra `GetReferencedAssemblies()` cho toàn bộ luật 1–6 và BuildingBlocks invariants.
   - [`ProjectReferenceRuleValidator.cs`](../../backend/tests/Architecture.Tests/Rules/ProjectReferenceRuleValidator.cs): kiểm tra `<ProjectReference>` trong `.csproj` dưới `backend/src/` theo đúng `REPO_STRUCTURE` §2.
   - [`ModuleDbContextRule.cs`](../../backend/tests/Architecture.Tests/Rules/ModuleDbContextRule.cs): kiểm tra mỗi `DbContext` trong `BrainMemo.<Module>.Infrastructure` chỉ ánh xạ bảng có prefix của module (luật 4) và assembly có ít nhất 1 EF Core `Migration` dưới `BrainMemo.<Module>.Infrastructure.Migrations` (luật 8).
   - [`SqlSchemaArchitectureRule.cs`](../../backend/tests/Architecture.Tests/Rules/SqlSchemaArchitectureRule.cs): kiểm tra `db/schema.sql` không có `FOREIGN KEY ... REFERENCES` xuyên module (luật 7).
   - [`ModerationReviewPurposeRule.cs`](../../backend/tests/Architecture.Tests/Rules/ModerationReviewPurposeRule.cs): triển khai `ICustomRule` của NetArchTest + phân tích CIL qua `Mono.Cecil` bảo đảm `purpose=MODERATION_REVIEW` / `AccessPurpose.ModerationReview` chỉ được truyền từ `BrainMemo.Moderation.*` (luật 9; phát hiện gọi trực tiếp, biến cục bộ, ternary, `async` state machine, và chuỗi literal `"MODERATION_REVIEW"`, đồng thời vẫn cho phép `Course` đánh giá `purpose == AccessPurpose.ModerationReview` nội bộ).

4. **Kiểm thử ([`SolutionArchitectureTests.cs`](../../backend/tests/Architecture.Tests/SolutionArchitectureTests.cs), [`ArchitectureViolationTests.cs`](../../backend/tests/Architecture.Tests/ArchitectureViolationTests.cs)):**
   - `SolutionArchitectureTests` (4 test): kiểm tra giải pháp hiện tại (`SharedKernel`, `BuildingBlocks.Abstractions`, `BuildingBlocks.Infrastructure`, `WebApi`), `.csproj`, và `db/schema.sql` đạt sạch.
   - `ArchitectureViolationTests` (9 test dùng Roslyn `CSharpCompilation` biên dịch assembly tạm + fixture `.csproj`/SQL): chứng minh test chuyển **ĐỎ** khi cố tình vi phạm từng luật 1..9 và BuildingBlocks, và **XANH** khi tuân thủ.

## Kết quả kiểm tra

- `dotnet build backend\BrainMemo.sln --no-restore --disable-build-servers -p:UseSharedCompilation=false -m:1`: build sạch (**0 Warning(s), 0 Error(s)**).
- `dotnet test backend\BrainMemo.sln --no-build --logger "console;verbosity=normal"` (chạy với `BypassSandbox: true`):
  - `BuildingBlocks.UnitTests`: **37/37 passed**.
  - `WebApi.Tests`: **44/44 passed**.
  - `Architecture.Tests`: **13/13 passed**.
  - Tổng: **94/94 passed**, 0 failed, 0 skipped.
- `dotnet format backend\BrainMemo.sln --verify-no-changes --no-restore` (chạy với `BypassSandbox: true`): đạt (exit `0`).

## Điểm lệch hợp đồng / Ghi chú cho các task tiếp theo

- Không sửa `frontend/`, `openapi/`, `contracts/`.
- Từ `T-S1+`, mọi `DbContext` của module cần có constructor hỗ trợ `(DbContextOptions<TDbContext>)` (hoặc `(DbContextOptions)` / rỗng) và ánh xạ rõ ràng tên bảng `<prefix>_*` qua `ToTable(...)` / `[Table(...)]`, kèm migration trong namespace `BrainMemo.<Module>.Infrastructure.Migrations` để `ModuleDbContextRule` kiểm tra thành công.
- Khi cần đọc nội dung khóa để kiểm duyệt ở `T-S2+` / Moderation, chỉ module `BrainMemo.Moderation.*` được truyền `AccessPurpose.ModerationReview` vào `ICourseContract.GetCourseAccess`.
