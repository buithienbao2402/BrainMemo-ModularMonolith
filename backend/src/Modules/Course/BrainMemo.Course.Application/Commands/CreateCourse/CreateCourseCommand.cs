using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Course.Application.Commands.CreateCourse;

public sealed record CreateCourseCommand(
    Guid OwnerUserId,
    string Name,
    string? Description,
    CourseAccessMode AccessMode,
    CourseStatus Status,
    IReadOnlyList<string>? Tags,
    string? CoverUploadKey) : ICommand<CourseDto>;
