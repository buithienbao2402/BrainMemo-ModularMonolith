using BrainMemo.BuildingBlocks.Abstractions.Persistence;
using BrainMemo.BuildingBlocks.Infrastructure;
using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Application.Auth.Commands.Register;
using BrainMemo.Identity.Application.Auth.Commands.VerifyEmail;
using BrainMemo.Identity.Application.Options;
using BrainMemo.Identity.Contracts;
using BrainMemo.Identity.Infrastructure;
using BrainMemo.Identity.Infrastructure.Persistence;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Xunit;

namespace Identity.UnitTests;

public sealed class IdentityModuleDiTests
{
    [Fact]
    public void IdentityModule_RegistersDbContextUnitOfWorkContractAndSecurityServices()
    {
        ServiceCollection services = new();
        services.AddLogging();
        services.AddBuildingBlocksInfrastructure(
            typeof(IdentityModuleDiTests).Assembly,
            typeof(RegisterCommand).Assembly);

        IConfiguration configuration = new EmptyConfiguration();
        IdentityModule module = new();
        Assert.Equal("Identity", module.Name);

        module.RegisterServices(services, configuration);

        using ServiceProvider provider = services.BuildServiceProvider();
        using IServiceScope scope = provider.CreateScope();

        Assert.NotNull(scope.ServiceProvider.GetService<IdentityDbContext>());
        Assert.NotNull(scope.ServiceProvider.GetService<IIdentityContract>());
        Assert.NotNull(scope.ServiceProvider.GetService<IIdentityAuthRepository>());
        Assert.NotNull(scope.ServiceProvider.GetService<IPostCommitEventQueue>());
        Assert.NotNull(scope.ServiceProvider.GetService<IPasswordHasher>());
        Assert.NotNull(scope.ServiceProvider.GetService<ITokenCryptoService>());
        Assert.NotNull(scope.ServiceProvider.GetService<IRequestHandler<RegisterCommand, Result>>());
        Assert.NotNull(scope.ServiceProvider.GetService<IRequestHandler<VerifyEmailCommand, Result>>());

        IdentityOptions options = scope.ServiceProvider.GetRequiredService<IOptions<IdentityOptions>>().Value;
        Assert.True(options.EmailVerificationTokenTtl > TimeSpan.Zero);
        Assert.True(options.PasswordResetTokenTtl > TimeSpan.Zero);

        Assert.Contains(
            scope.ServiceProvider.GetServices<IUnitOfWork>(),
            static u => u.ModuleName == "Identity");
    }

    [Fact]
    public void IdentityModule_OptionsValidation_RejectsNonPositiveTtls()
    {
        ServiceCollection services = new();
        services.AddLogging();
        services.AddBuildingBlocksInfrastructure(typeof(RegisterCommand).Assembly);

        IConfiguration configuration = new EmptyConfiguration(new Dictionary<string, string?>
        {
            ["Identity:EmailVerificationTokenTtl"] = "00:00:00",
            ["Identity:PasswordResetTokenTtl"] = "-00:05:00",
        });

        new IdentityModule().RegisterServices(services, configuration);

        using ServiceProvider provider = services.BuildServiceProvider();
        OptionsValidationException ex = Assert.Throws<OptionsValidationException>(
            () => provider.GetRequiredService<IOptions<IdentityOptions>>().Value);

        Assert.Contains(ex.Failures, static f => f.Contains("EmailVerificationTokenTtl", StringComparison.Ordinal));
        Assert.Contains(ex.Failures, static f => f.Contains("PasswordResetTokenTtl", StringComparison.Ordinal));
    }

    private sealed class EmptyConfiguration(IReadOnlyDictionary<string, string?>? values = null) : IConfiguration
    {
        private readonly IReadOnlyDictionary<string, string?> _values = values ?? new Dictionary<string, string?>();

        public string? this[string key]
        {
            get => _values.TryGetValue(key, out string? value) ? value : null;
            set { }
        }

        public IEnumerable<IConfigurationSection> GetChildren()
            => _values.Keys
                .Select(static k => k.Split(':')[0])
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Select(GetSection);

        public IChangeToken GetReloadToken() => new EmptyChangeToken();

        public IConfigurationSection GetSection(string key) => new EmptySection(key, _values);
    }

    private sealed class EmptySection(string path, IReadOnlyDictionary<string, string?> values) : IConfigurationSection
    {
        public string? this[string childKey]
        {
            get => values.TryGetValue($"{path}:{childKey}", out string? value) ? value : null;
            set { }
        }

        public string Key => path.Contains(':', StringComparison.Ordinal)
            ? path[(path.LastIndexOf(':') + 1)..]
            : path;

        public string Path => path;

        public string? Value
        {
            get => values.TryGetValue(path, out string? value) ? value : null;
            set { }
        }

        public IEnumerable<IConfigurationSection> GetChildren()
        {
            string prefix = $"{path}:";
            return values.Keys
                .Where(k => k.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                .Select(k => k[prefix.Length..].Split(':')[0])
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Select(child => GetSection(child));
        }

        public IChangeToken GetReloadToken() => new EmptyChangeToken();

        public IConfigurationSection GetSection(string childKey) => new EmptySection($"{path}:{childKey}", values);
    }

    private sealed class EmptyChangeToken : IChangeToken
    {
        public bool HasChanged => false;

        public bool ActiveChangeCallbacks => false;

        public IDisposable RegisterChangeCallback(Action<object?> callback, object? state) => NullDisposable.Instance;
    }

    private sealed class NullDisposable : IDisposable
    {
        public static readonly NullDisposable Instance = new();

        public void Dispose()
        {
        }
    }
}
