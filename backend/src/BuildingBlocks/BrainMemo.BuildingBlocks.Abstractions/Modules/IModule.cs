using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BrainMemo.BuildingBlocks.Abstractions.Modules;

/// <summary>
/// Self-contained module installer discovered dynamically by BrainMemo.WebApi at startup.
/// </summary>
public interface IModule
{
    string Name { get; }

    void RegisterServices(IServiceCollection services, IConfiguration configuration);
}

