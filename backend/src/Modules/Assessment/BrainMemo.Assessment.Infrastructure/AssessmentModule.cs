using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.Grading;
using BrainMemo.Assessment.Contracts;
using BrainMemo.Assessment.Infrastructure.Contracts;
using BrainMemo.Assessment.Infrastructure.Persistence;
using BrainMemo.BuildingBlocks.Abstractions.Modules;
using BrainMemo.BuildingBlocks.Infrastructure.Outbox;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BrainMemo.Assessment.Infrastructure;

public sealed class AssessmentModule : IModule
{
    private const string FallbackDevConnectionString =
        "Server=localhost;Port=3307;Database=brainmemo_lms;User=brainmemo;Password=brainmemo_dev_pw;SslMode=None;AllowPublicKeyRetrieval=True;";

    public string Name => "Assessment";

    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        string? connectionString = configuration.GetConnectionString("Default");
        string resolvedConnectionString = string.IsNullOrWhiteSpace(connectionString)
            ? FallbackDevConnectionString
            : connectionString;

        services.AddDbContext<AssessmentDbContext>(options =>
            options.UseMySql(
                resolvedConnectionString,
                AssessmentDbContext.DefaultMySqlServerVersion));

        services.AddOutboxStore<AssessmentDbContext>("Assessment");

        services.AddScoped<IAssessmentRepository, AssessmentRepository>();

        // Register Grading Strategies
        services.AddSingleton<IGradingStrategy, MultipleChoiceGradingStrategy>();
        services.AddSingleton<IGradingStrategy, TrueFalseGradingStrategy>();
        services.AddSingleton<IGradingStrategy, FillBlankGradingStrategy>();
        services.AddSingleton<IGradingStrategy, MatchingGradingStrategy>();
        services.AddSingleton<IGradingStrategy, EssayGradingStrategy>();

        services.AddScoped<IAssessmentContract, AssessmentContractService>();
    }
}
