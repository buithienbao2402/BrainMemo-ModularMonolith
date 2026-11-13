using BrainMemo.Notification.Domain.Entities;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Notification.Application.Abstractions;

public interface IAnnouncementRepository
{
    Task<Result> AddAsync(Announcement announcement, CancellationToken ct = default);

    Task<Announcement?> FindByIdAsync(Guid id, CancellationToken ct = default);
}
