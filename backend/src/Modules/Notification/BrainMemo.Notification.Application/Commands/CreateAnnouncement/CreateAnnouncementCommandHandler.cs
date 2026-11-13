using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Notification.Application.Abstractions;
using BrainMemo.Notification.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Notification.Application.Commands.CreateAnnouncement;

internal sealed class CreateAnnouncementCommandHandler(
    IAnnouncementRepository announcementRepository,
    IClock clock) : ICommandHandler<CreateAnnouncementCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateAnnouncementCommand request, CancellationToken cancellationToken)
    {
        DateTimeOffset utcNow = clock.UtcNow;
        Guid id = Guid.NewGuid();

        Result<Announcement> createResult = Announcement.Create(
            id,
            request.Title,
            request.Body,
            request.CreatedByUserId,
            utcNow);

        if (createResult.IsFailure)
        {
            return createResult.Error;
        }

        Result addResult = await announcementRepository
            .AddAsync(createResult.Value, cancellationToken)
            .ConfigureAwait(false);

        if (addResult.IsFailure)
        {
            return addResult.Error;
        }

        return id;
    }
}
