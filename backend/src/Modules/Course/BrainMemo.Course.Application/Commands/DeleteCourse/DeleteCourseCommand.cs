using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Course.Application.Commands.DeleteCourse;

public sealed record DeleteCourseCommand(
    Guid CourseId,
    Guid CurrentUserId) : ICommand;
