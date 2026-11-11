using BrainMemo.BuildingBlocks.Abstractions.Modules;
using BrainMemo.WebApi.Modules;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace WebApi.Tests.Modules;

public sealed class ModuleRegistryTests
{
    [Fact]
    public void AddBrainMemoModules_DiscoversAndRegistersIModuleFromAdditionalAssemblies()
    {
        ServiceCollection services = new();
        IMvcBuilder mvcBuilder = services.AddControllers();
        IConfiguration configuration = new ConfigurationBuilder().Build();

        services.AddBrainMemoModules(mvcBuilder, configuration, typeof(SampleTestModule).Assembly);

        using ServiceProvider sp = services.BuildServiceProvider();
        ModuleCatalog catalog = sp.GetRequiredService<ModuleCatalog>();
        SampleModuleService? registered = sp.GetService<SampleModuleService>();

        Assert.Contains("TestSample", catalog.RegisteredModules);
        Assert.NotNull(registered);
    }

    public sealed class SampleTestModule : IModule
    {
        public string Name => "TestSample";

        public void RegisterServices(IServiceCollection services, IConfiguration configuration)
        {
            services.AddSingleton<SampleModuleService>();
        }
    }

    public sealed class SampleModuleService;
}

