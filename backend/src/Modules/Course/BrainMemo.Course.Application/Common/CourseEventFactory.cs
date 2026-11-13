using BrainMemo.Course.Contracts.Events;
using BrainMemo.Course.Domain.Entities;

namespace BrainMemo.Course.Application.Common;

public static class CourseEventFactory
{
    public static CourseUpserted CreateUpsertedEvent(
        Course course,
        IReadOnlyList<string> changedFields,
        DateTimeOffset utcNow)
    {
        ArgumentNullException.ThrowIfNull(course);
        ArgumentNullException.ThrowIfNull(changedFields);

        bool eligible = course.IsEligible();

        if (eligible)
        {
            return new CourseUpserted(
                EventId: Guid.NewGuid(),
                OccurredAt: utcNow,
                CourseId: course.Id,
                Revision: course.Revision,
                Eligible: true,
                ChangedFields: changedFields,
                OwnerUserId: course.OwnerUserId,
                Name: course.Name,
                Description: course.Description,
                CoverStorageKey: course.CoverStorageKey,
                AccessMode: course.AccessMode.ToString().ToUpperInvariant(),
                Status: course.Status.ToString().ToUpperInvariant(),
                Tags: course.Tags.Select(static t => t.Tag).ToList(),
                CreatedAt: course.CreatedAt,
                UpdatedAt: course.UpdatedAt);
        }

        // When eligible = false: MUST NOT contain name, description or any content (D18, acceptance criteria)
        return new CourseUpserted(
            EventId: Guid.NewGuid(),
            OccurredAt: utcNow,
            CourseId: course.Id,
            Revision: course.Revision,
            Eligible: false,
            ChangedFields: changedFields,
            OwnerUserId: null,
            Name: null,
            Description: null,
            CoverStorageKey: null,
            AccessMode: null,
            Status: null,
            Tags: null,
            CreatedAt: null,
            UpdatedAt: null);
    }
}
