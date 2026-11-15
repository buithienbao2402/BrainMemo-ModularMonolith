using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Course.Application.Commands.LeaveCourse;

public sealed record LeaveCourseCommand(Guid CourseId, Guid UserId) : ICommand;
