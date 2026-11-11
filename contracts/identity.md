```csharp
public interface IIdentityContract {
  Result<AccountStatusDto> GetAccountStatus(Guid userId);          // NOT_FOUND
  Result<bool> IsAdmin(Guid userId);
  Result<bool> IsLastAdmin(Guid userId);                           // chỉ kiểm tra sớm, KHÔNG thay kiểm tra nguyên tử
  Result<IReadOnlyList<UserSummaryDto>> GetUserSummary(IReadOnlyList<Guid> userIds);
  Result<Page<Guid>> ListActiveUserIds(Guid? afterId, int limit /*<=50*/);
  Result<Guid?> FindUserIdByEmail(string email);                   // MỚI (DEC-26): mời học viên
  Result LockAccount(Guid userId, LockType type, DateTimeOffset? until, string reason, Guid sanctionId, Guid actorAdminId);
                                                                   // idempotent theo sanctionId; LAST_ADMIN, SELF_LOCK, ALREADY_LOCKED, NOT_FOUND
  Result UnlockAccount(Guid userId, string reason, Guid actorAdminId); // phát AccountUnlocked(MANUAL)
}
public enum LockType { Temporary, Permanent }
public record AccountStatusDto(string Status, DateTimeOffset? LockedUntil, string? LockReason, bool EmailVerified);
public record UserSummaryDto(Guid Id, string Status, DateTimeOffset CreatedAt, string Email);
```
Hành vi: `LockAccount` trong một transaction: khóa dòng grant Admin (FOR UPDATE, theo `id`), kiểm "Admin ACTIVE cuối", đổi `account_status`, thu hồi mọi phiên (`ACCOUNT_LOCKED`). Nếu chạy trong `IModerationTransaction` thì dùng transaction ngoài.
Event phát: `UserRegistered`, `EmailVerificationRequested`, `PasswordResetRequested` (chứa `RawToken` chỉ trong bộ nhớ), `AccountLocked`, `AccountUnlocked`.
Contract Version: 1