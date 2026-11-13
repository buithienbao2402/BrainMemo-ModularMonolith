using BrainMemo.BuildingBlocks.Abstractions.Email;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.BuildingBlocks.Abstractions.Modules;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Notification.Application.Abstractions;
using BrainMemo.Notification.Application.EventHandlers;
using BrainMemo.Notification.Application.Options;
using BrainMemo.Notification.Infrastructure.Email;
using BrainMemo.Notification.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace BrainMemo.Notification.Infrastructure;

public sealed class NotificationModule : IModule
{
    private const string FallbackDevConnectionString =
        "Server=localhost;Port=3307;Database=brainmemo_lms;User=brainmemo;Password=brainmemo_dev_pw;SslMode=None;AllowPublicKeyRetrieval=True;";

    public string Name => "Notification";

    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.SectionName));
        services.Configure<NotificationEmailOptions>(configuration.GetSection(NotificationEmailOptions.SectionName));

        string? connectionString = configuration.GetConnectionString("Default");
        string resolvedConnectionString = string.IsNullOrWhiteSpace(connectionString)
            ? FallbackDevConnectionString
            : connectionString;

        services.AddDbContext<NotificationDbContext>(options =>
            options.UseMySql(
                resolvedConnectionString,
                NotificationDbContext.DefaultMySqlServerVersion));

        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<IAnnouncementRepository, AnnouncementRepository>();
        services.AddScoped<IEmailDeliveryRepository, EmailDeliveryRepository>();
        services.TryAddScoped<IEmailSender, SmtpEmailSender>();

        services.AddScoped<IIntegrationEventHandler<EmailVerificationRequested>, EmailVerificationRequestedEventHandler>();
        services.AddScoped<IIntegrationEventHandler<PasswordResetRequested>, PasswordResetRequestedEventHandler>();
        services.AddScoped<IIntegrationEventHandler<AccountLocked>, AccountLockedEventHandler>();
    }
}
