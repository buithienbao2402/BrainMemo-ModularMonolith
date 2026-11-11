using BrainMemo.BuildingBlocks.Abstractions.Persistence;
using BrainMemo.BuildingBlocks.Infrastructure;
using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Contracts;
using BrainMemo.Identity.Infrastructure;
using BrainMemo.Identity.Infrastructure.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
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
        services.AddBuildingBlocksInfrastructure(typeof(IdentityModuleDiTests).Assembly);

        IConfiguration configuration = new EmptyConfiguration();
        IdentityModule module = new();
        Assert.Equal("Identity", module.Name);

        module.RegisterServices(services, configuration);

        using ServiceProvider provider = services.BuildServiceProvider();
        using IServiceScope scope = provider.CreateScope();

        Assert.NotNull(scope.ServiceProvider.GetService<IdentityDbContext>());
        Assert.NotNull(scope.ServiceProvider.GetService<IIdentityContract>());
        Assert.NotNull(scope.ServiceProvider.GetService<IPasswordHasher>());
        Assert.NotNull(scope.ServiceProvider.GetService<ITokenCryptoService>());
        Assert.Contains(
            scope.ServiceProvider.GetServices<IUnitOfWork>(),
            static u => u.ModuleName == "Identity");
    }

    private sealed class EmptyConfiguration : IConfiguration
    {
        public string? this[string key]
        {
            get => null;
            set { }
        }

        public IEnumerable<IConfigurationSection> GetChildren() => [];

        public IChangeToken GetReloadToken() => new EmptyChangeToken();

        public IConfigurationSection GetSection(string key) => new EmptySection(key);
    }

    private sealed class EmptySection(string key) : IConfigurationSection
    {
        public string? this[string childKey]
        {
            get => null;
            set { }
        }

        public string Key => key;

        public string Path => key;

        public string? Value
        {
            get => null;
            set { }
        }

        public IEnumerable<IConfigurationSection> GetChildren() => [];

        public IChangeToken GetReloadToken() => new EmptyChangeToken();

        public IConfigurationSection GetSection(string childKey) => new EmptySection($"{key}:{childKey}");
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
