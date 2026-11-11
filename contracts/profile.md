```csharp
public interface IProfileContract {
  Result<PublicProfileDto> GetPublicProfile(Guid userId);          // Khách dùng được; NOT_FOUND
  Result<IReadOnlyList<DisplayInfoDto>> GetDisplayInfo(IReadOnlyList<Guid> userIds); // theo lô; avatarUrl Presigned 1h
}
public record DisplayInfoDto(Guid UserId, string DisplayName, string? AvatarUrl);
public record PublicProfileDto(Guid UserId, string DisplayName, string? AvatarUrl, string? Bio, DateTimeOffset JoinedAt, bool ShowCourseList);
```
Tiêu thụ: `UserRegistered` (tạo hồ sơ, display name mặc định "Người dùng " + 6 hex ngẫu nhiên của userId). Phát: `ProfileUpdated`. Gọi ra: Identity `GetUserSummary`; Course `ListUserCourses`.
Contract Version: 1