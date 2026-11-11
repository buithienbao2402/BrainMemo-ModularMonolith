using System.Diagnostics;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BrainMemo.BuildingBlocks.Infrastructure.MediatR;

/// <summary>
/// Logs request execution metadata without serializing request payloads (prevents leaking secrets/answers).
/// </summary>
public sealed class LoggingBehavior<TRequest, TResponse>(
    ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(next);

        string requestName = typeof(TRequest).Name;
        long startedAt = Stopwatch.GetTimestamp();

        logger.LogInformation("Handling request {RequestName}", requestName);

        try
        {
            TResponse response = await next().ConfigureAwait(false);
            double elapsedMs = Stopwatch.GetElapsedTime(startedAt).TotalMilliseconds;

            if (response is Result { IsFailure: true } failedResult)
            {
                logger.LogWarning(
                    "Request {RequestName} failed with code {ErrorCode} in {ElapsedMs:0.0} ms",
                    requestName,
                    failedResult.Error.Code,
                    elapsedMs);
            }
            else
            {
                logger.LogInformation(
                    "Handled request {RequestName} in {ElapsedMs:0.0} ms",
                    requestName,
                    elapsedMs);
            }

            return response;
        }
        catch (Exception ex)
        {
            double elapsedMs = Stopwatch.GetElapsedTime(startedAt).TotalMilliseconds;
            logger.LogError(
                ex,
                "Request {RequestName} threw unhandled exception after {ElapsedMs:0.0} ms",
                requestName,
                elapsedMs);
            throw;
        }
    }
}
