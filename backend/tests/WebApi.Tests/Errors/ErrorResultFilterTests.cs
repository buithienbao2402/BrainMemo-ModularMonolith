using BrainMemo.SharedKernel.Results;
using BrainMemo.WebApi.Errors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Xunit;

namespace WebApi.Tests.Errors;

public sealed class ErrorResultFilterTests
{
    [Fact]
    public void OnResultExecuting_TranslatesErrorObjectResultToProblemDetails()
    {
        ErrorResultFilter filter = new();
        ResultExecutingContext context = CreateContext(
            new ObjectResult(Error.Conflict(ErrorCodes.EmailTaken, "Email đã tồn tại.")));

        filter.OnResultExecuting(context);

        ObjectResult translated = Assert.IsType<ObjectResult>(context.Result);
        Assert.Equal(StatusCodes.Status409Conflict, translated.StatusCode);
        Assert.Contains("application/problem+json", translated.ContentTypes);

        ProblemDetails problem = Assert.IsType<ProblemDetails>(translated.Value);
        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
        Assert.Equal("Email đã tồn tại.", problem.Title);
        Assert.Equal(ErrorCodes.EmailTaken, problem.Extensions["code"]);
    }

    [Fact]
    public void OnResultExecuting_TranslatesFailedResultObjectResultToProblemDetails()
    {
        ErrorResultFilter filter = new();
        ResultExecutingContext context = CreateContext(
            new ObjectResult(Result.Failure(new Error(ErrorCodes.TokenInvalidOrExpired, "Token không hợp lệ."))));

        filter.OnResultExecuting(context);

        ObjectResult translated = Assert.IsType<ObjectResult>(context.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, translated.StatusCode);

        ProblemDetails problem = Assert.IsType<ProblemDetails>(translated.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
        Assert.Equal("Token không hợp lệ.", problem.Title);
        Assert.Equal(ErrorCodes.TokenInvalidOrExpired, problem.Extensions["code"]);
    }

    [Fact]
    public void OnResultExecuting_LeavesNonErrorResultsUntouched()
    {
        ErrorResultFilter filter = new();
        ObjectResult okResult = new("ok") { StatusCode = StatusCodes.Status200OK };
        ResultExecutingContext objectContext = CreateContext(okResult);

        filter.OnResultExecuting(objectContext);
        Assert.Same(okResult, objectContext.Result);

        StatusCodeResult createdResult = new(StatusCodes.Status201Created);
        ResultExecutingContext statusContext = CreateContext(createdResult);

        filter.OnResultExecuting(statusContext);
        Assert.Same(createdResult, statusContext.Result);
    }

    private static ResultExecutingContext CreateContext(IActionResult result)
    {
        DefaultHttpContext httpContext = new();
        httpContext.Request.Path = "/api/v1/auth/register";
        httpContext.TraceIdentifier = "trace-test-123";

        ActionContext actionContext = new(httpContext, new RouteData(), new ActionDescriptor());
        return new ResultExecutingContext(
            actionContext,
            [],
            result,
            controller: new object());
    }
}
