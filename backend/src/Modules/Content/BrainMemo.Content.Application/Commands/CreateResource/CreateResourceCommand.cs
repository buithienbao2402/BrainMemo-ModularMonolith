using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts.Dtos;

namespace BrainMemo.Content.Application.Commands.CreateResource;

public sealed record CreateResourceCommand(
    Guid CourseId,
    Guid RequesterUserId,
    string UploadKey,
    string OriginalFilename) : ICommand<ResourceDto>;
