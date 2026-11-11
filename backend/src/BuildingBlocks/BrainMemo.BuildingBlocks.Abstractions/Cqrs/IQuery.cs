using BrainMemo.SharedKernel.Results;
using MediatR;

namespace BrainMemo.BuildingBlocks.Abstractions.Cqrs;

/// <summary>
/// Read-only query returning a typed <see cref="Result{TResponse}"/> without starting a write transaction.
/// </summary>
public interface IQuery<TResponse> : IRequest<Result<TResponse>>
{
}
