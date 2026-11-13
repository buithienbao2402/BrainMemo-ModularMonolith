using BrainMemo.BuildingBlocks.Abstractions.Modules;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Application.Common;
using BrainMemo.Content.Contracts;
using BrainMemo.Content.Infrastructure.Contracts;
using BrainMemo.Content.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BrainMemo.Content.Infrastructure;

public sealed class ContentModule : IModule
{
    private const string FallbackDevConnectionString =
        "Server=localhost;Port=3307;Database=brainmemo_lms;User=brainmemo;Password=brainmemo_dev_pw;SslMode=None;AllowPublicKeyRetrieval=True;";

    public string Name => "Content";

    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        string? connectionString = configuration.GetConnectionString("Default");
        string resolvedConnectionString = string.IsNullOrWhiteSpace(connectionString)
            ? FallbackDevConnectionString
            : connectionString;

        services.AddDbContext<ContentDbContext>(options =>
            options.UseMySql(
                resolvedConnectionString,
                ContentDbContext.DefaultMySqlServerVersion));

        services.AddScoped<IContentRepository, ContentRepository>();
        services.AddScoped<IContentContract, ContentContractService>();
        services.AddSingleton<IHtmlSanitizer, HtmlSanitizer>();
    }
}
