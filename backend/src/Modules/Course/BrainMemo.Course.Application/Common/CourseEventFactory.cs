using BrainMemo.Course.Contracts.Events;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Common;

public static class CourseEventFactory
{
    public static CourseUpserted CreateUpsertedEvent(CourseEntity course, DateTimeOffset now)
    {
        bool isEligible = course.IsEligible();

        if (isEligible)
        {
            return new CourseUpserted(
                EventId: Guid.NewGuid(),
                OccurredAt: now,
                CourseId: course.Id,
                Eligible: true,
                Revision: course.Revision,
                Name: course.Name,
                Description: course.Description,
                AccessMode: course.AccessMode.ToString().ToUpperInvariant(),
                Status: course.Status.ToString().ToUpperInvariant(),
                Tags: course.Tags.Select(t => t.Tag).ToArray(),
                OwnerUserId: course.OwnerUserId);
        }

        // RULE D18: When eligible is false, do NOT include content (Name, Description, Tags, etc.)
        return new CourseUpserted(
            EventId: Guid.NewGuid(),
            OccurredAt: now,
            CourseId: course.Id,
            Eligible: false,
            Revision: course.Revision,
            Name: null,
            Description: null,
            AccessMode: null,
            Status: null,
            Tags: null,
            OwnerUserId: null);
    }
}
