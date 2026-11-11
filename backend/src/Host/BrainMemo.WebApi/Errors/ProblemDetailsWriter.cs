using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using BrainMemo.SharedKernel.Results;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace BrainMemo.WebApi.Errors;

/// <summary>
/// Builds and writes RFC 9457 ProblemDetails JSON matching openapi/openapi.root.yaml and contracts/README.md §3.
/// </summary>
public static class ProblemDetailsWriter
{
    public const string ProblemContentType = "application/problem+json; charset=utf-8";

    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public static ProblemDetails Create(
        Error error,
        HttpContext httpContext,
        string? detail = null)
    {
        ArgumentNullException.ThrowIfNull(error);
        ArgumentNullException.ThrowIfNull(httpContext);

        (int statusCode, string title) = ErrorCodeMapper.Resolve(error.Code, error.Message);
        return Create(
            code: string.IsNullOrWhiteSpace(error.Code) ? ErrorCodeMapper.InternalServerErrorCode : error.Code,
            statusCode: statusCode,
            title: title,
            httpContext: httpContext,
            detail: detail,
            errors: error.Details,
            metadata: error.Metadata);
    }

    public static ProblemDetails Create(
        string code,
        int statusCode,
        string title,
        HttpContext httpContext,
        string? detail = null,
        IReadOnlyList<ValidationFailureDetail>? errors = null,
        IReadOnlyDictionary<string, object?>? metadata = null)
    {
        ArgumentNullException.ThrowIfNull(httpContext);

        string normalizedCode = string.IsNullOrWhiteSpace(code)
            ? ErrorCodeMapper.InternalServerErrorCode
            : code;

        ProblemDetails problem = new()
        {
            Type = $"urn:brainmemo:error:{normalizedCode.ToLowerInvariant().Replace('_', '-')}",
            Title = title,
            Status = statusCode,
            Detail = detail,
            Instance = httpContext.Request.Path.HasValue ? httpContext.Request.Path.Value : null,
        };

        problem.Extensions["code"] = normalizedCode;
        problem.Extensions["traceId"] = Activity.Current?.Id ?? httpContext.TraceIdentifier;

        if (errors is { Count: > 0 })
        {
            problem.Extensions["errors"] = errors
                .Select(e => new { field = ToCamelCasePath(e.Field), message = e.Message })
                .ToArray();
        }

        if (metadata is { Count: > 0 })
        {
            foreach (KeyValuePair<string, object?> item in metadata)
            {
                if (!string.IsNullOrWhiteSpace(item.Key))
                {
                    problem.Extensions[ToCamelCaseSegment(item.Key)] = item.Value;
                }
            }
        }

        return problem;
    }

    public static ProblemDetails CreateFromModelState(
        ModelStateDictionary modelState,
        HttpContext httpContext)
    {
        ArgumentNullException.ThrowIfNull(modelState);
        ArgumentNullException.ThrowIfNull(httpContext);

        bool hasJsonParseError = modelState.Values
            .SelectMany(v => v.Errors)
            .Any(e => e.Exception is JsonException)
            || modelState.Keys.Any(k => k == "$");

        if (hasJsonParseError)
        {
            (_, string malformedTitle) = ErrorCodeMapper.Resolve(ErrorCodes.MalformedRequest);
            return Create(
                code: ErrorCodes.MalformedRequest,
                statusCode: StatusCodes.Status400BadRequest,
                title: malformedTitle,
                httpContext: httpContext);
        }

        ValidationFailureDetail[] details = modelState
            .Where(kvp => kvp.Value?.Errors.Count > 0)
            .SelectMany(kvp => kvp.Value!.Errors.Select(err =>
            {
                string message = string.IsNullOrWhiteSpace(err.ErrorMessage)
                    ? "Giá trị không hợp lệ."
                    : err.ErrorMessage;
                return new ValidationFailureDetail(kvp.Key, message);
            }))
            .ToArray();

        return Create(Error.Validation("Dữ liệu đầu vào không hợp lệ.", details), httpContext);
    }

    public static async Task WriteAsync(
        HttpContext httpContext,
        Error error,
        string? detail = null,
        CancellationToken ct = default)
    {
        ProblemDetails problem = Create(error, httpContext, detail);
        await WriteProblemAsync(httpContext, problem, ct).ConfigureAwait(false);
    }

    public static async Task WriteProblemAsync(
        HttpContext httpContext,
        ProblemDetails problem,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(httpContext);
        ArgumentNullException.ThrowIfNull(problem);

        if (httpContext.Response.HasStarted)
        {
            return;
        }

        httpContext.Response.StatusCode = problem.Status ?? StatusCodes.Status500InternalServerError;
        httpContext.Response.ContentType = ProblemContentType;

        CancellationToken effectiveCt = ct.CanBeCanceled ? ct : httpContext.RequestAborted;
        await JsonSerializer
            .SerializeAsync(httpContext.Response.Body, problem, SerializerOptions, effectiveCt)
            .ConfigureAwait(false);
    }

    internal static string ToCamelCasePath(string field)
    {
        if (string.IsNullOrWhiteSpace(field))
        {
            return string.Empty;
        }

        string[] segments = field.Split('.', StringSplitOptions.RemoveEmptyEntries);
        return string.Join('.', segments.Select(ToCamelCaseSegment));
    }

    private static string ToCamelCaseSegment(string segment)
    {
        if (string.IsNullOrEmpty(segment) || char.IsLower(segment[0]))
        {
            return segment;
        }

        return JsonNamingPolicy.CamelCase.ConvertName(segment);
    }
}
