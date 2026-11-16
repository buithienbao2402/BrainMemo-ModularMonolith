using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.BuildingBlocks.Abstractions.Modules;
using BrainMemo.Content.Contracts.Events;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Discovery.Application.EventHandlers;
using BrainMemo.Discovery.Application.Services;
using BrainMemo.Discovery.Contracts;
using BrainMemo.Discovery.Domain.Repositories;
using BrainMemo.Discovery.Infrastructure.Persistence;
using BrainMemo.Discovery.Infrastructure.Repositories;
using BrainMemo.Learning.Contracts.Events;
using BrainMemo.Profile.Contracts.Events;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BrainMemo.Discovery.Infrastructure;

public sealed class DiscoveryModule : IModule
{
    private const string FallbackDevConnectionString =
        "Server=localhost;Port=3307;Database=brainmemo_lms;User=brainmemo;Password=brainmemo_dev_pw;SslMode=None;AllowPublicKeyRetrieval=True;";

    public string Name => "Discovery";

    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        string? connectionString = configuration.GetConnectionString("Default");
        string resolvedConnectionString = string.IsNullOrWhiteSpace(connectionString)
            ? FallbackDevConnectionString
            : connectionString;

        services.AddDbContext<DiscoveryDbContext>(options =>
            options.UseMySql(
                resolvedConnectionString,
                DiscoveryDbContext.DefaultMySqlServerVersion));

        services.AddScoped<ICourseEntryRepository, CourseEntryRepository>();
        services.AddScoped<ICourseActivityFactRepository, CourseActivityFactRepository>();
        services.AddScoped<ISearchHistoryRepository, SearchHistoryRepository>();

        services.AddScoped<DiscoveryService>();
        services.AddScoped<IDiscoveryContract>(sp => sp.GetRequiredService<DiscoveryService>());

        // Đăng ký các Integration Event Handler
        services.AddScoped<IIntegrationEventHandler<CourseUpserted>, CourseUpsertedEventHandler>();
        services.AddScoped<IIntegrationEventHandler<CoursePermanentlyDeleted>, CoursePermanentlyDeletedEventHandler>();
        services.AddScoped<IIntegrationEventHandler<ChapterPublished>, ChapterPublishedEventHandler>();
        services.AddScoped<IIntegrationEventHandler<ChapterDeleted>, ChapterDeletedEventHandler>();
        services.AddScoped<IIntegrationEventHandler<EnrollmentChanged>, EnrollmentChangedEventHandler>();
        services.AddScoped<IIntegrationEventHandler<NominationChanged>, NominationChangedEventHandler>();
        services.AddScoped<IIntegrationEventHandler<ProfileUpdated>, ProfileUpdatedEventHandler>();
        services.AddScoped<IIntegrationEventHandler<CommentCreated>, CommentCreatedEventHandler>();
    }
}
