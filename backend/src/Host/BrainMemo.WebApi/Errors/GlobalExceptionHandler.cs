using System.Text.Json;
using BrainMemo.SharedKernel.Results;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace BrainMemo.WebApi.Errors;

/// <summary>
/// Global exception handler translating unhandled and malformed request exceptions into Vietnamese ProblemDetails.
/// </summary>
public sealed class GlobalExceptionHandler(
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is BadHttpRequestException or JsonException)
        {
            logger.LogWarning(exception, "Malformed HTTP request on {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);
            (_, string title) = ErrorCodeMapper.Resolve(ErrorCodes.MalformedRequest);
            await ProblemDetailsWriter
                .WriteAsync(httpContext, new Error(ErrorCodes.MalformedRequest, title))
                .ConfigureAwait(false);
            return true;
        }

        logger.LogError(exception, "Unhandled exception on {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);
        (_, string serverTitle) = ErrorCodeMapper.Resolve(ErrorCodeMapper.InternalServerErrorCode);
        await ProblemDetailsWriter
            .WriteAsync(httpContext, new Error(ErrorCodeMapper.InternalServerErrorCode, serverTitle))
            .ConfigureAwait(false);

        return true;
    }
}

