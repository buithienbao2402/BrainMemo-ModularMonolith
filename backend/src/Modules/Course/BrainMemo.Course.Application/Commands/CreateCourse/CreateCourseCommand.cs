using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts.Dtos;

namespace BrainMemo.Course.Application.Commands.CreateCourse;

public sealed record CreateCourseCommand(
    Guid OwnerUserId,
    string Name,
    string? Description,
    string AccessMode,
    string? Status,
    IReadOnlyList<string>? Tags,
    string? CoverUploadKey) : ICommand<CourseDto>;
