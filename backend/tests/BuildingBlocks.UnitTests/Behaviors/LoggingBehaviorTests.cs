using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Infrastructure.MediatR;
using BrainMemo.SharedKernel.Results;
using Microsoft.Extensions.Logging;
using Xunit;

namespace BuildingBlocks.UnitTests.Behaviors;

public sealed class LoggingBehaviorTests
{
    [Fact]
    public async Task LoggingBehavior_LogsRequestNameAndFailureCode_WithoutLeakingSecrets()
    {
        CapturingLogger<LoggingBehavior<SecretLoginCommand, Result>> logger = new();
        LoggingBehavior<SecretLoginCommand, Result> behavior = new(logger);
        SecretLoginCommand command = new("user@example.com", "SuperSecretPassword123!");

        Result response = await behavior.Handle(
            command,
            () => Task.FromResult(Result.Failure(new Error(ErrorCodes.InvalidCredentials, "Sai thong tin."))),
            CancellationToken.None);

        Assert.True(response.IsFailure);
        Assert.Contains(logger.Entries, e => e.Level == LogLevel.Information && e.Message.Contains("SecretLoginCommand"));
        Assert.Contains(logger.Entries, e => e.Level == LogLevel.Warning && e.Message.Contains(ErrorCodes.InvalidCredentials));
        Assert.DoesNotContain(logger.Entries, e => e.Message.Contains("SuperSecretPassword123!", StringComparison.Ordinal));
    }

    public sealed record SecretLoginCommand(string Email, string Password) : ICommand;

    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public List<(LogLevel Level, string Message)> Entries { get; } = [];

        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            Entries.Add((logLevel, formatter(state, exception)));
        }
    }
}
