using BrainMemo.SharedKernel.Results;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.WebApi.Errors;

/// <summary>
/// Converts <see cref="Result"/> and <see cref="Result{TValue}"/> into HTTP responses or RFC 9457 ProblemDetails.
/// </summary>
public static class ResultActionResultExtensions
{
    public static IActionResult ToActionResult(this Result result, HttpContext httpContext)
    {
        ArgumentNullException.ThrowIfNull(result);
        ArgumentNullException.ThrowIfNull(httpContext);

        return result.IsSuccess
            ? new NoContentResult()
            : ToProblemActionResult(result.Error, httpContext);
    }

    public static IActionResult ToActionResult<TValue>(this Result<TValue> result, HttpContext httpContext)
    {
        ArgumentNullException.ThrowIfNull(result);
        ArgumentNullException.ThrowIfNull(httpContext);

        return result.IsSuccess
            ? new OkObjectResult(result.Value)
            : ToProblemActionResult(result.Error, httpContext);
    }

    public static IResult ToHttpResult(this Result result, HttpContext httpContext)
    {
        ArgumentNullException.ThrowIfNull(result);
        ArgumentNullException.ThrowIfNull(httpContext);

        return result.IsSuccess
            ? Microsoft.AspNetCore.Http.Results.NoContent()
            : ToProblemHttpResult(result.Error, httpContext);
    }

    public static IResult ToHttpResult<TValue>(this Result<TValue> result, HttpContext httpContext)
    {
        ArgumentNullException.ThrowIfNull(result);
        ArgumentNullException.ThrowIfNull(httpContext);

        return result.IsSuccess
            ? Microsoft.AspNetCore.Http.Results.Ok(result.Value)
            : ToProblemHttpResult(result.Error, httpContext);
    }

    private static ObjectResult ToProblemActionResult(Error error, HttpContext httpContext)
    {
        ProblemDetails problem = ProblemDetailsWriter.Create(error, httpContext);
        ObjectResult objectResult = new(problem)
        {
            StatusCode = problem.Status,
        };
        objectResult.ContentTypes.Add("application/problem+json");
        return objectResult;
    }

    private static IResult ToProblemHttpResult(Error error, HttpContext httpContext)
    {
        ProblemDetails problem = ProblemDetailsWriter.Create(error, httpContext);
        return Microsoft.AspNetCore.Http.Results.Problem(problem);
    }
}

