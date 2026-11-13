using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Course.Application.Commands.UpdateCourse;

public sealed record UpdateCourseCommand(
    Guid CourseId,
    Guid CurrentUserId,
    string? Name,
    string? Description,
    CourseAccessMode? AccessMode,
    CourseStatus? Status,
    IReadOnlyList<string>? Tags,
    string? CoverUploadKey,
    bool? RemoveCover) : ICommand<CourseDto>;
