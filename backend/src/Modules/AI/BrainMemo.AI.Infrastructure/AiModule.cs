using BrainMemo.AI.Application.Abstractions;
using BrainMemo.AI.Contracts;
using BrainMemo.AI.Infrastructure.Background;
using BrainMemo.AI.Infrastructure.Contracts;
using BrainMemo.AI.Infrastructure.Llm;
using BrainMemo.AI.Infrastructure.Persistence;
using BrainMemo.AI.Infrastructure.Services;
using BrainMemo.BuildingBlocks.Abstractions.Ai;
using BrainMemo.BuildingBlocks.Abstractions.Modules;
using BrainMemo.BuildingBlocks.Abstractions.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BrainMemo.AI.Infrastructure;

public sealed class AiModule : IModule
{
    private const string FallbackDevConnectionString =
        "Server=localhost;Port=3307;Database=brainmemo_lms;User=brainmemo;Password=brainmemo_dev_pw;SslMode=None;AllowPublicKeyRetrieval=True;";

    public string Name => "AI";

    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        string? connectionString = configuration.GetConnectionString("Default");
        string resolvedConnectionString = string.IsNullOrWhiteSpace(connectionString)
            ? FallbackDevConnectionString
            : connectionString;

        services.AddDbContext<AiDbContext>(options =>
            options.UseMySql(
                resolvedConnectionString,
                AiDbContext.DefaultMySqlServerVersion));

        services.AddScoped<IAiRepository, AiRepository>();
        services.AddScoped<IAiContract, AiContractService>();
        services.AddScoped<ISystemSettings, SystemSettingsService>();

        services.AddHttpClient<ILlmClient, GeminiLlmClient>();

        services.AddSingleton<IAiJobQueue, AiJobQueue>();
        services.AddHostedService<AiJobBackgroundWorker>();
    }
}
