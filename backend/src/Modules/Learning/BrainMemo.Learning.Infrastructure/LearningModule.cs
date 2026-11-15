using BrainMemo.BuildingBlocks.Abstractions.Modules;
using BrainMemo.BuildingBlocks.Infrastructure.Outbox;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Contracts;
using BrainMemo.Learning.Infrastructure.Contracts;
using BrainMemo.Learning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BrainMemo.Learning.Infrastructure;

public sealed class LearningModule : IModule
{
    private const string FallbackDevConnectionString =
        "Server=localhost;Port=3307;Database=brainmemo_lms;User=brainmemo;Password=brainmemo_dev_pw;SslMode=None;AllowPublicKeyRetrieval=True;";

    public string Name => "Learning";

    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        string? connectionString = configuration.GetConnectionString("Default");
        string resolvedConnectionString = string.IsNullOrWhiteSpace(connectionString)
            ? FallbackDevConnectionString
            : connectionString;

        services.AddDbContext<LearningDbContext>(options =>
            options.UseMySql(
                resolvedConnectionString,
                LearningDbContext.DefaultMySqlServerVersion));

        services.AddOutboxStore<LearningDbContext>("Learning");

        services.AddScoped<ILearningRepository, LearningRepository>();
        services.AddScoped<ILearningContract, LearningContractService>();
    }
}
