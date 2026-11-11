using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.BuildingBlocks.Infrastructure.Time;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace BrainMemo.BuildingBlocks.Infrastructure.Storage;

/// <summary>
/// Registers S3-compatible <see cref="IFileStorage"/> backed by Cloudflare R2 or MinIO.
/// </summary>
public static class StorageServiceCollectionExtensions
{
    public static IServiceCollection AddS3FileStorage(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services.TryAddSingleton<IClock, SystemClock>();
        services.AddOptions<S3Options>()
            .Bind(configuration.GetSection(S3Options.SectionName));
        services.TryAddSingleton<IFileStorage, S3FileStorage>();

        return services;
    }
}

