using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Persistence;
using BrainMemo.BuildingBlocks.Abstractions.Transactions;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BrainMemo.BuildingBlocks.Infrastructure.MediatR;

/// <summary>
/// Wraps commands (<see cref="ICommandBase"/>) in their module unit-of-work transaction, rolling back on Result.Failure or exception.
/// Queries bypass transactions cleanly. When an ambient moderation transaction is active (DEC-04), participates without starting a new transaction.
/// </summary>
public sealed class TransactionBehavior<TRequest, TResponse>(
    IEnumerable<IUnitOfWork> unitOfWorks,
    ILogger<TransactionBehavior<TRequest, TResponse>> logger,
    IAmbientTransactionAccessor? ambientTransactionAccessor = null)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(next);

        if (request is not ICommandBase)
        {
            return await next().ConfigureAwait(false);
        }

        if (ambientTransactionAccessor?.Current is not null)
        {
            logger.LogDebug(
                "Executing command {CommandName} within active ambient moderation transaction",
                typeof(TRequest).Name);
            return await next().ConfigureAwait(false);
        }

        IUnitOfWork? unitOfWork = ResolveModuleUnitOfWork(typeof(TRequest), unitOfWorks);
        if (unitOfWork is null)
        {
            return await next().ConfigureAwait(false);
        }

        await using IUnitOfWorkTransaction transaction = await unitOfWork
            .BeginTransactionAsync(cancellationToken)
            .ConfigureAwait(false);

        try
        {
            TResponse response = await next().ConfigureAwait(false);

            if (response is Result { IsFailure: true })
            {
                await transaction.RollbackAsync(CancellationToken.None).ConfigureAwait(false);
                return response;
            }

            await unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

            return response;
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None).ConfigureAwait(false);
            throw;
        }
    }

    internal static string? TryExtractModuleName(Type requestType)
    {
        string? candidate = requestType.Namespace ?? requestType.Assembly.GetName().Name;
        if (string.IsNullOrWhiteSpace(candidate))
        {
            return null;
        }

        string[] parts = candidate.Split('.', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 2 && string.Equals(parts[0], "BrainMemo", StringComparison.Ordinal))
        {
            string module = parts[1];
            if (!string.Equals(module, "BuildingBlocks", StringComparison.Ordinal)
                && !string.Equals(module, "SharedKernel", StringComparison.Ordinal)
                && !string.Equals(module, "WebApi", StringComparison.Ordinal))
            {
                return module;
            }
        }

        return null;
    }

    private static IUnitOfWork? ResolveModuleUnitOfWork(Type requestType, IEnumerable<IUnitOfWork> unitOfWorks)
    {
        string? moduleName = TryExtractModuleName(requestType);
        if (moduleName is null)
        {
            return null;
        }

        return unitOfWorks.FirstOrDefault(
            uow => string.Equals(uow.ModuleName, moduleName, StringComparison.OrdinalIgnoreCase));
    }
}
