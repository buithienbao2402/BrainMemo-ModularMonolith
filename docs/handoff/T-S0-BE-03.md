# Handoff Note – T-S0-BE-03

- **Task:** `T-S0-BE-03` – Outbox chung: bảng-agnostic `OutboxWriter` + `OutboxDispatcher` (HostedService) dùng cho Course/Learning/Assessment
- **Vai trò:** BE
- **Nhánh:** `feat/T-S0-BE-03-shared-outbox`
- **Trạng thái:** REVIEW

## Đã thực hiện

1. **Abstractions (`backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Abstractions/Outbox/`):**
   - [`OutboxMessage.cs`](../../backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Abstractions/Outbox/OutboxMessage.cs): entity bảng-agnostic khớp cấu trúc 8 cột + 1 index của `crs_outbox_event`, `lrn_outbox_event`, `ast_outbox_event` (`id`, `event_type` ≤ 60, `aggregate_id`, `payload`, `created_at`, `published_at`, `attempt_count`, `last_error` ≤ 500) với factory `Create` và phương thức `MarkPublished` / `MarkFailed`.
   - [`OutboxEventNameAttribute.cs`](../../backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Abstractions/Outbox/OutboxEventNameAttribute.cs): attribute tùy chọn đặt tên ngắn `event_type` (≤ 60 ký tự) khớp `contracts/events.md`.
   - [`IOutboxWriter.cs`](../../backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Abstractions/Outbox/IOutboxWriter.cs): `WriteAsync(moduleName, aggregateId, @event, ct)` và `WriteAsync(aggregateId, @event, ct)` (suy ra module theo namespace `BrainMemo.<Module>.*`).
   - [`IOutboxStore.cs`](../../backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Abstractions/Outbox/IOutboxStore.cs): cổng lưu trữ bảng-agnostic (`ModuleName`, `ExistsAsync`, `AddAsync`, `GetUnpublishedAsync`, `SaveChangesAsync`).

2. **Infrastructure (`backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Infrastructure/Outbox/` & [`DependencyInjection.cs`](../../backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Infrastructure/DependencyInjection.cs)):**
   - [`OutboxModelBuilderExtensions.cs`](../../backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Infrastructure/Outbox/OutboxModelBuilderExtensions.cs): `ConfigureOutboxMessage(tableName, publishIndexName?)` ánh xạ đồng nhất bảng `crs_outbox_event` / `lrn_outbox_event` / `ast_outbox_event` và index `ix_<prefix>_publish (published_at, created_at)`.
   - [`EfOutboxStore.cs`](../../backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Infrastructure/Outbox/EfOutboxStore.cs): gắn trực tiếp vào `DbContext` của module (không gọi `SaveChangesAsync` sớm khi ghi nên tham gia cùng DB transaction của `TransactionBehavior` hoặc `IModerationTransaction`); kiểm tra trùng `EventId` cả trong `ChangeTracker` cục bộ lẫn DB trước khi thêm.
   - [`OutboxWriter.cs`](../../backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Infrastructure/Outbox/OutboxWriter.cs): tuần tự hóa JSON camelCase + enum chuỗi (`OutboxJson`), bỏ trùng theo `EventId`, ghi vào đúng `IOutboxStore` của module.
   - [`OutboxEventTypeRegistry.cs`](../../backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Infrastructure/Outbox/OutboxEventTypeRegistry.cs): ánh xạ 2 chiều `event_type` (`VARCHAR(60)`) ↔ CLR `IntegrationEvent`, hỗ trợ `[OutboxEventName]`, tên đầy đủ/bỏ hậu tố `Event`, và tự quét assembly `BrainMemo.*`.
   - [`InMemoryOutboxDeliveryTracker.cs`](../../backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Infrastructure/Outbox/InMemoryOutboxDeliveryTracker.cs): cache giới hạn (`DeduplicationCacheSize = 10000`) chặn phát trùng in-process nếu `IEventBus.Publish` đã xong nhưng bước cập nhật `published_at` gặp lỗi tạm thời.
   - [`OutboxDispatcher.cs`](../../backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Infrastructure/Outbox/OutboxDispatcher.cs): `BackgroundService` (`IHostedService`) + `DispatchOnceAsync`, mở scope định kỳ đọc các bản ghi `published_at IS NULL` (`AttemptCount < MaxAttempts`) theo `(created_at, id)`, phát qua `IEventBus`, đánh dấu `PublishedAt` hoặc ghi `AttemptCount` + `LastError` an toàn (≤ 500 ký tự, không log payload).
   - [`OutboxServiceCollectionExtensions.cs`](../../backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Infrastructure/Outbox/OutboxServiceCollectionExtensions.cs): `AddOutboxCore` (gọi mặc định trong `AddBuildingBlocksInfrastructure`), `AddOutboxDispatcher`, `AddOutboxStore<TDbContext>(moduleName)`.

3. **Host (`backend/src/Host/BrainMemo.WebApi/`):**
   - [`Program.cs`](../../backend/src/Host/BrainMemo.WebApi/Program.cs) đăng ký `AddOutboxDispatcher(builder.Configuration)`.
   - [`appsettings.json`](../../backend/src/Host/BrainMemo.WebApi/appsettings.json) bổ sung mục cấu hình `"Outbox"` (`Enabled`, `PollingInterval`, `BatchSize`, `MaxAttempts`, `DeduplicationCacheSize`).

4. **Kiểm thử ([`OutboxTests.cs`](../../backend/tests/BuildingBlocks.UnitTests/Outbox/OutboxTests.cs) & [`WebApiHostIntegrationTests.cs`](../../backend/tests/WebApi.Tests/Host/WebApiHostIntegrationTests.cs)):**
   - Kiểm tra 3 `DbContext` (`crs_outbox_event`, `lrn_outbox_event`, `ast_outbox_event`) cùng chia sẻ `OutboxWriter` & `OutboxDispatcher`.
   - Kiểm tra ghi cùng TX (`TransactionBehavior`): trước `CommitAsync` `OutboxDispatcher` phát 0 event; rollback (`Result.Failure` / exception) hủy cả domain lẫn outbox; chỉ phát sau commit.
   - Kiểm tra bỏ trùng theo `EventId` khi ghi trùng trước/sau `SaveChangesAsync` và khi `SaveChangesAsync` lỗi tạm thời sau lúc `IEventBus.Publish` thành công.
   - Kiểm tra retry khi handler lỗi tạm thời (không bị bỏ trùng nhầm) và giới hạn `MaxAttempts` cho poison message.
   - Kiểm tra vòng lặp nền `BackgroundService` (`StartAsync`/`StopAsync`) và kiểm tra `WebApi.Tests` xác nhận host đăng ký `OutboxDispatcher` làm `IHostedService`.

## Kết quả kiểm tra

- `dotnet build backend\BrainMemo.sln --no-restore --disable-build-servers -p:UseSharedCompilation=false -m:1`: build sạch (**0 Warning(s), 0 Error(s)**).
- `dotnet test backend\BrainMemo.sln --no-build --logger "console;verbosity=normal"`:
  - `BuildingBlocks.UnitTests`: **37/37 passed**.
  - `WebApi.Tests`: **44/44 passed**.
  - Tổng: **81/81 passed**, 0 failed, 0 skipped.
- `dotnet format backend\BrainMemo.sln --verify-no-changes --no-restore`: đạt (exit 0).

## Ghi chú tích hợp cho Course (`T-S2-BE-02`), Learning (`T-S4`+), Assessment (`T-S7`+)

- Không sửa `frontend/`, `openapi/`, `contracts/`.
- Ở `DbContext` của mỗi module có Outbox: thêm `DbSet<OutboxMessage> OutboxEvents => Set<OutboxMessage>();`, gọi `modelBuilder.ConfigureOutboxMessage("crs_outbox_event")` (hoặc `"lrn_outbox_event"` / `"ast_outbox_event"`), và gọi `services.AddOutboxStore<ModuleDbContext>("<ModuleName>")` trong `IModule.RegisterServices`.
- Trong Application command handler: gọi `await _outboxWriter.WriteAsync(aggregateId, @event, ct)` trước khi return `Result.Success()` để `TransactionBehavior` commit nguyên tử entity nghiệp vụ cùng bản ghi outbox.
