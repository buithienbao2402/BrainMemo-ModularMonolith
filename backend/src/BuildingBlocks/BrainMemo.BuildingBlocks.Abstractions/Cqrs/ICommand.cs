using BrainMemo.SharedKernel.Results;
using MediatR;

namespace BrainMemo.BuildingBlocks.Abstractions.Cqrs;

/// <summary>
/// Non-generic marker implemented by all commands that must execute within a unit-of-work transaction.
/// </summary>
public interface ICommandBase
{
}

/// <summary>
/// Command returning a non-generic <see cref="Result"/>.
/// </summary>
public interface ICommand : IRequest<Result>, ICommandBase
{
}

/// <summary>
/// Command returning a typed <see cref="Result{TResponse}"/>.
/// </summary>
public interface ICommand<TResponse> : IRequest<Result<TResponse>>, ICommandBase
{
}
