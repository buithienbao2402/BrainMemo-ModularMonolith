using System.Text.Json;
using System.Text.Json.Serialization;
using BrainMemo.BuildingBlocks.Infrastructure.Outbox;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using BrainMemo.WebApi.Errors;
using BrainMemo.WebApi.Modules;
using BrainMemo.WebApi.Options;
using BrainMemo.WebApi.RateLimiting;
using BrainMemo.WebApi.Security;
using BrainMemo.WebApi.Swagger;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

IMvcBuilder mvcBuilder = builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = actionContext =>
        {
            ProblemDetails problem = ProblemDetailsWriter.CreateFromModelState(
                actionContext.ModelState,
                actionContext.HttpContext);
            ObjectResult result = new(problem)
            {
                StatusCode = problem.Status,
            };
            result.ContentTypes.Add("application/problem+json");
            return result;
        };
    });

CorsOptions corsOptions = builder.Configuration
    .GetSection(CorsOptions.SectionName)
    .Get<CorsOptions>() ?? new CorsOptions();
string[] allowedOrigins = corsOptions.GetOrigins();

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsOptions.PolicyName, policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy
                .WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
    });
});

builder.Services.AddBrainMemoRateLimiting();
builder.Services.AddBrainMemoJwtAuthentication(builder.Configuration, builder.Environment);
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy("BrainMemo.WebApi is healthy."));
builder.Services.AddBrainMemoSwagger();
builder.Services.AddBrainMemoModules(mvcBuilder, builder.Configuration);
builder.Services.AddOutboxDispatcher(builder.Configuration);

WebApplication app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages(async statusCodeContext =>
{
    HttpContext httpContext = statusCodeContext.HttpContext;
    if (httpContext.Response.HasStarted || !string.IsNullOrEmpty(httpContext.Response.ContentType))
    {
        return;
    }

    int statusCode = httpContext.Response.StatusCode;
    string code = statusCode switch
    {
        StatusCodes.Status401Unauthorized => ErrorCodes.Unauthenticated,
        StatusCodes.Status403Forbidden => ErrorCodes.Forbidden,
        StatusCodes.Status404NotFound => ErrorCodes.NotFound,
        StatusCodes.Status429TooManyRequests => ErrorCodes.RateLimited,
        >= 400 and < 500 => ErrorCodes.MalformedRequest,
        _ => ErrorCodeMapper.InternalServerErrorCode,
    };

    (_, string defaultTitle) = ErrorCodeMapper.Resolve(code);
    ProblemDetails problem = ProblemDetailsWriter.Create(code, statusCode, defaultTitle, httpContext);
    await ProblemDetailsWriter.WriteProblemAsync(httpContext, problem).ConfigureAwait(false);
});

app.UseBrainMemoSwaggerIfEnabled();
app.UseRouting();
app.UseCors(CorsOptions.PolicyName);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = async (httpContext, report) =>
    {
        IClock clock = httpContext.RequestServices.GetRequiredService<IClock>();
        ModuleCatalog catalog = httpContext.RequestServices.GetRequiredService<ModuleCatalog>();

        httpContext.Response.ContentType = "application/json; charset=utf-8";
        var payload = new
        {
            status = report.Status.ToString(),
            service = "BrainMemo.WebApi",
            utcNow = clock.UtcNow,
            modules = catalog.RegisteredModules,
        };

        await httpContext.Response.WriteAsJsonAsync(payload, httpContext.RequestAborted).ConfigureAwait(false);
    },
})
.AllowAnonymous()
.DisableRateLimiting();

app.MapControllers();

app.Run();

public partial class Program;

