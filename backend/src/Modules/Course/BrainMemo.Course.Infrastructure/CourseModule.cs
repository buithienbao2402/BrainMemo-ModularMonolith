using BrainMemo.BuildingBlocks.Abstractions.Modules;
using BrainMemo.BuildingBlocks.Infrastructure.Outbox;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Infrastructure.Contracts;
using BrainMemo.Course.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BrainMemo.Course.Infrastructure;

public sealed class CourseModule : IModule
{
    private const string FallbackDevConnectionString =
        "Server=localhost;Port=3307;Database=brainmemo_lms;User=brainmemo;Password=brainmemo_dev_pw;SslMode=None;AllowPublicKeyRetrieval=True;";

    public string Name => "Course";

    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        string? connectionString = configuration.GetConnectionString("Default");
        string resolvedConnectionString = string.IsNullOrWhiteSpace(connectionString)
            ? FallbackDevConnectionString
            : connectionString;

        services.AddDbContext<CourseDbContext>(options =>
            options.UseMySql(
                resolvedConnectionString,
                CourseDbContext.DefaultMySqlServerVersion));

        services.AddOutboxStore<CourseDbContext>("Course");

        services.AddScoped<ICourseRepository, CourseRepository>();
        services.AddScoped<ICourseContract, CourseContractService>();
    }
}
