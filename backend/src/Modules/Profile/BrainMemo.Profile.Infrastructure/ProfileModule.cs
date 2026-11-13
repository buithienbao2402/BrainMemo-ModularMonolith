using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.BuildingBlocks.Abstractions.Modules;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Profile.Application.Abstractions;
using BrainMemo.Profile.Application.EventHandlers;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Infrastructure.Contracts;
using BrainMemo.Profile.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BrainMemo.Profile.Infrastructure;

public sealed class ProfileModule : IModule
{
    private const string FallbackDevConnectionString =
        "Server=localhost;Port=3307;Database=brainmemo_lms;User=brainmemo;Password=brainmemo_dev_pw;SslMode=None;AllowPublicKeyRetrieval=True;";

    public string Name => "Profile";

    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        string? connectionString = configuration.GetConnectionString("Default");
        string resolvedConnectionString = string.IsNullOrWhiteSpace(connectionString)
            ? FallbackDevConnectionString
            : connectionString;

        services.AddDbContext<ProfileDbContext>(options =>
            options.UseMySql(
                resolvedConnectionString,
                ProfileDbContext.DefaultMySqlServerVersion));

        services.AddScoped<IProfileRepository, ProfileRepository>();
        services.AddScoped<IProfileContract, ProfileContractService>();
        services.AddScoped<IIntegrationEventHandler<UserRegistered>, UserRegisteredEventHandler>();
    }
}
