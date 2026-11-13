using BrainMemo.BuildingBlocks.Abstractions.Modules;
using BrainMemo.BuildingBlocks.Abstractions.Persistence;
using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Application.Options;
using BrainMemo.Identity.Contracts;
using BrainMemo.Identity.Infrastructure.Contracts;
using BrainMemo.Identity.Infrastructure.Options;
using BrainMemo.Identity.Infrastructure.Persistence;
using BrainMemo.Identity.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace BrainMemo.Identity.Infrastructure;

/// <summary>
/// Registers Identity persistence, contracts, options, and security primitives into the BrainMemo host container.
/// </summary>
public sealed class IdentityModule : IModule
{
    private const string FallbackDevConnectionString =
        "Server=localhost;Port=3307;Database=brainmemo_lms;User=brainmemo;Password=brainmemo_dev_pw;SslMode=None;AllowPublicKeyRetrieval=True;";

    public string Name => "Identity";

    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services.Configure<IdentityOptions>(configuration.GetSection(IdentityOptions.SectionName));
        services.TryAddEnumerable(ServiceDescriptor.Singleton<IValidateOptions<IdentityOptions>, IdentityOptionsValidator>());
        services.Configure<IdentityJwtOptions>(configuration.GetSection(IdentityJwtOptions.SectionName));

        string? connectionString = configuration.GetConnectionString("Default");
        string resolvedConnectionString = string.IsNullOrWhiteSpace(connectionString)
            ? FallbackDevConnectionString
            : connectionString;

        services.AddDbContext<IdentityDbContext>(options =>
            options.UseMySql(
                resolvedConnectionString,
                IdentityDbContext.DefaultMySqlServerVersion));

        services.AddScoped<IdentityPostCommitEventQueue>();
        services.AddScoped<IPostCommitEventQueue>(sp => sp.GetRequiredService<IdentityPostCommitEventQueue>());
        services.AddScoped<IIdentityAuthRepository, IdentityAuthRepository>();
        services.AddScoped<IUnitOfWork, IdentityUnitOfWork>();
        services.AddScoped<IIdentityContract, IdentityContractService>();
        services.TryAddSingleton<IPasswordHasher, BCryptPasswordHasher>();
        services.TryAddSingleton<ITokenCryptoService, Sha256TokenCryptoService>();
        services.TryAddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();
    }
}
