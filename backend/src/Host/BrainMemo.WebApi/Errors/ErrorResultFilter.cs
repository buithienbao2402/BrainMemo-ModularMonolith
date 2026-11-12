using BrainMemo.SharedKernel.Results;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace BrainMemo.WebApi.Errors;

/// <summary>
/// Translates module controller <see cref="ObjectResult"/> responses carrying a failed <see cref="Result"/> or <see cref="Error"/> into RFC 9457 ProblemDetails.
/// </summary>
public sealed class ErrorResultFilter : IAlwaysRunResultFilter
{
    public void OnResultExecuting(ResultExecutingContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        if (context.Result is not ObjectResult objectResult)
        {
            return;
        }

        Error? error = objectResult.Value switch
        {
            Error err => err,
            Result { IsFailure: true } failed => failed.Error,
            _ => null,
        };

        if (error is null)
        {
            return;
        }

        context.Result = Result.Failure(error).ToActionResult(context.HttpContext);
    }

    public void OnResultExecuted(ResultExecutedContext context)
    {
    }
}
