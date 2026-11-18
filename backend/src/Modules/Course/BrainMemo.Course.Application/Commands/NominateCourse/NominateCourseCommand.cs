using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Course.Application.Commands.NominateCourse;

public sealed record NominateCourseCommand(Guid CourseId, Guid UserId) : ICommand;
