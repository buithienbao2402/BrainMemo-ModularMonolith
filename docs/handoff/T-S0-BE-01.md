# Handoff Note – T-S0-BE-01

- **Task:** `T-S0-BE-01` – Solution `BrainMemo.sln` + dự án BuildingBlocks (`SharedKernel`, `Abstractions`, `Infrastructure`) + unit test `Result`/`Paging`
- **Vai trò:** BE
- **Nhánh:** `feat/T-S0-BE-01-solution-buildingblocks`
- **Trạng thái:** DONE

## Đã thực hiện

1. **Solution & cấu hình build chung (`backend/`):**
   - Tạo [`backend/BrainMemo.sln`](../../backend/BrainMemo.sln) và [`backend/Directory.Build.props`](../../backend/Directory.Build.props) (`net9.0`, `Nullable=enable`, `ImplicitUsings=enable`, `TreatWarningsAsErrors=true`, `Deterministic=true`).
   - Ghi chú chọn `net9.0`: tận dụng `Guid.CreateVersion7()` có sẵn trong BCL cho UUIDv7, khớp các gói EF Core 9 / `Pomelo.EntityFrameworkCore.MySql` `9.0.0` / `JwtBearer` `9.0.2` / `Swashbuckle` `9.0.6` đã cài sẵn trên môi trường (thỏa `README.md`: `.NET 8 LTS trở lên`).

2. **`BrainMemo.SharedKernel` (0 project/NuGet reference):**
   - `Results/`: `Result`, `Result<TValue>`, `Error`, `ValidationFailureDetail`, và `ErrorCodes` chứa đủ 35 mã lỗi chuẩn ở `contracts/README.md` §3.
   - `Domain/`: `Entity<TId>`, `Entity`, `AggregateRoot<TId>`, `AggregateRoot`, `IDomainEvent`, `IHasDomainEvents`, `ValueObject`.
   - `Time/`: `IClock`, `UuidV7`.
   - `Events/`: `IntegrationEvent(Guid EventId, DateTimeOffset OccurredAt)` đặt ở `SharedKernel` để mọi dự án `*.Contracts` kế thừa mà vẫn tuân luật `REPO_STRUCTURE` §2.1 (`*.Contracts` chỉ tham chiếu `SharedKernel`).
   - `Pagination/`: `PagingConstants` (`MaxPageSize = 50`), `PageRequest`, `CursorPageRequest`, `PagedResult<T>` (đồng bộ cả `Total` theo `contracts/README` và `TotalItems`/`TotalPages` theo `openapi.root.yaml`), `Page<T>`.

3. **`BrainMemo.BuildingBlocks.Abstractions` (tham chiếu `SharedKernel` + `MediatR` `12.4.1`):**
   - `Cqrs/`: `ICommandBase`, `ICommand`, `ICommand<TResponse>`, `IQuery<TResponse>`, `ICommandHandler<,>`, `IQueryHandler<,>`.
   - `Events/`: `IEventBus`, `IIntegrationEventHandler<in TEvent>`.
   - `Persistence/`: `IUnitOfWork`, `IUnitOfWorkTransaction`.
   - Đủ các cổng hạ tầng từ `contracts/README.md` §2: `IFileStorage` (`PresignedUpload`, `FileHead`), `ILlmClient` (`LlmResult`), `IPhoBertClient` (`ModerationScore`), `IEmailSender` (`EmailMessage`), `ISystemSettings` (`SystemSettingKeys`), `IModerationTransaction` (`IModerationTxContext`, `IAmbientTransactionAccessor`).

4. **`BrainMemo.BuildingBlocks.Infrastructure`:**
   - `Time/SystemClock`, `Pagination/QueryablePagingExtensions` (`ToPagedResultAsync`, `ToPagedResult`, `ToPageAsync`, `ToPage`).
   - MediatR behaviors: `LoggingBehavior<,>` (chỉ log tên request, mã lỗi và thời gian xử lý — không serialize payload/mật khẩu/token), `ValidationBehavior<,>` (trả `Result`/`Result<T>` lỗi `VALIDATION_FAILED` kèm `errors[]` thay vì ném `ValidationException`), `TransactionBehavior<,>` (chỉ bọc `ICommandBase`, match `IUnitOfWork` theo module `BrainMemo.<Module>.*`, rollback khi `Result.Failure` hoặc exception, nhường transaction ngoài nếu `IAmbientTransactionAccessor.Current != null`).
   - `Events/InProcessEventBus` (dispatch đúng runtime type của `IntegrationEvent` tới mọi `IIntegrationEventHandler<TEvent>`), `Transactions/AmbientTransactionAccessor`, `DependencyInjection` (`AddBuildingBlocksBehaviors`, `AddBuildingBlocksInfrastructure`).

5. **`backend/tests/BuildingBlocks.UnitTests`:**
   - Tạo 32 unit test cho `Result`/`Error`, `Paging` + EF Core `InMemory`, `Domain` primitives (`Entity`/`AggregateRoot`/`ValueObject`/`UuidV7`/`SystemClock`), `ValidationBehavior`, `TransactionBehavior`, `LoggingBehavior`, `InProcessEventBus`.

## Kết quả kiểm tra

- `dotnet restore backend\BrainMemo.sln`: đạt (exit 0).
- `dotnet build backend\BrainMemo.sln --no-restore --disable-build-servers -p:UseSharedCompilation=false -m:1`: build sạch (**0 Warning(s), 0 Error(s)**).
- `dotnet test backend\tests\BuildingBlocks.UnitTests\BuildingBlocks.UnitTests.csproj --no-build --logger "console;verbosity=normal"`: **32/32 passed** (exit 0).
- `dotnet format backend\BrainMemo.sln --verify-no-changes --no-restore`: đạt (exit 0).

## Điểm lệch hợp đồng / Ghi chú cho các task tiếp theo

- Không sửa `frontend/`, `openapi/`, `contracts/`.
- Chưa tạo `.csproj` cho `BrainMemo.WebApi`, `Architecture.Tests` và các module (`Identity`..`AI`) để giữ đúng phạm vi `T-S0-BE-01`; các task `T-S0-BE-02`..`05` và `T-S1-BE-01`.. sẽ thêm vào `backend/BrainMemo.sln`.
- **`T-S0-BE-02` (`BrainMemo.WebApi`):** Đăng ký module theo `AddBuildingBlocksBehaviors()` trong `AddMediatR(...)`; ánh xạ `ErrorCodes.*` + `Error.Details` (`errors[]`) + `Error.Metadata` sang ProblemDetails tiếng Việt theo `contracts/README.md` §3.
- **`T-S0-BE-03` (`Outbox`):** Đặt `OutboxWriter`/`OutboxDispatcher` trong `BuildingBlocks.Infrastructure` và có thể tái sử dụng `IEventBus` để phát event sau commit.
- **Lưu ý quy ước namespace cho `TransactionBehavior`:** Command của module `<Module>` đặt dưới namespace `BrainMemo.<Module>.*` và triển khai `IUnitOfWork` với `ModuleName = "<Module>"` để `TransactionBehavior` tự ghép đúng `DbContext`/transaction của module đó.
