using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts.Dtos;

namespace BrainMemo.Course.Application.Commands.EnrollCourse;

public sealed record EnrollCourseCommand(Guid CourseId, Guid UserId) : ICommand<EnrollmentDto>;
