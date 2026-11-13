using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts.Dtos;

namespace BrainMemo.Course.Application.Commands.UpdateCourse;

public sealed record UpdateCourseCommand(
    Guid CourseId,
    Guid UserId,
    string? Name,
    string? Description,
    string? AccessMode,
    string? Status,
    IReadOnlyList<string>? Tags,
    string? CoverUploadKey,
    bool? RemoveCover) : ICommand<CourseDto>;
