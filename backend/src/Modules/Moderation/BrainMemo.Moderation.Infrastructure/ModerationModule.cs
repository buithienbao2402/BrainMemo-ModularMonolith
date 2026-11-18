using BrainMemo.BuildingBlocks.Abstractions.Modules;
using BrainMemo.BuildingBlocks.Abstractions.Transactions;
using BrainMemo.Moderation.Application.Abstractions;
using BrainMemo.Moderation.Contracts;
using BrainMemo.Moderation.Infrastructure.BackgroundJobs;
using BrainMemo.Moderation.Infrastructure.Contracts;
using BrainMemo.Moderation.Infrastructure.Persistence;
using BrainMemo.Moderation.Infrastructure.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BrainMemo.Moderation.Infrastructure;

public sealed class ModerationModule : IModule
{
    private const string FallbackDevConnectionString =
        "Server=localhost;Port=3307;Database=brainmemo_lms;User=brainmemo;Password=brainmemo_dev_pw;SslMode=None;AllowPublicKeyRetrieval=True;";

    public string Name => "Moderation";

    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        string? connectionString = configuration.GetConnectionString("Default");
        string resolvedConnectionString = string.IsNullOrWhiteSpace(connectionString)
            ? FallbackDevConnectionString
            : connectionString;

        services.AddDbContext<ModerationDbContext>(options =>
            options.UseMySql(
                resolvedConnectionString,
                ModerationDbContext.DefaultMySqlServerVersion));

        services.AddScoped<IModerationRepository, ModerationRepository>();
        services.AddScoped<IModerationTransaction, ModerationTransaction>();
        services.AddScoped<IModerationContract, ModerationContractService>();
        services.AddHostedService<RestoreExpiredHiddenCoursesWorker>();
    }
}
