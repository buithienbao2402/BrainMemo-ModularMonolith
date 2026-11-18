using BrainMemo.BuildingBlocks.Abstractions.Modules;
using BrainMemo.Messaging.Application.Abstractions;
using BrainMemo.Messaging.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BrainMemo.Messaging.Infrastructure;

public sealed class MessagingModule : IModule
{
    private const string FallbackDevConnectionString =
        "Server=localhost;Port=3307;Database=brainmemo_lms;User=brainmemo;Password=brainmemo_dev_pw;SslMode=None;AllowPublicKeyRetrieval=True;";

    public string Name => "Messaging";

    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        string? connectionString = configuration.GetConnectionString("Default");
        string resolvedConnectionString = string.IsNullOrWhiteSpace(connectionString)
            ? FallbackDevConnectionString
            : connectionString;

        services.AddDbContext<MessagingDbContext>(options =>
            options.UseMySql(
                resolvedConnectionString,
                MessagingDbContext.DefaultMySqlServerVersion));

        services.AddScoped<IMessagingRepository, MessagingRepository>();
    }
}
