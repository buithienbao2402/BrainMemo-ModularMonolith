using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Infrastructure;
using BrainMemo.SharedKernel.Results;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BuildingBlocks.UnitTests.Behaviors;

public sealed class ValidationBehaviorTests
{
    [Fact]
    public async Task InvalidGenericCommand_ReturnsValidationFailedResultWithoutCallingHandler()
    {
        Counter state = new();
        await using ServiceProvider sp = BuildServices(state);
        ISender sender = sp.GetRequiredService<ISender>();

        Result<string> result = await sender.Send(new CreateItemCommand(string.Empty));

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.ValidationFailed, result.Error.Code);
        Assert.NotNull(result.Error.Details);
        Assert.Single(result.Error.Details!);
        Assert.Equal(nameof(CreateItemCommand.Title), result.Error.Details![0].Field);
        Assert.Equal(0, state.HandlerCalls);
    }

    [Fact]
    public async Task InvalidNonGenericCommand_ReturnsValidationFailedResultWithoutThrowing()
    {
        Counter state = new();
        await using ServiceProvider sp = BuildServices(state);
        ISender sender = sp.GetRequiredService<ISender>();

        Result result = await sender.Send(new PingCommand(string.Empty));

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.ValidationFailed, result.Error.Code);
        Assert.Equal(0, state.HandlerCalls);
    }

    [Fact]
    public async Task ValidCommand_PassesValidationAndExecutesHandler()
    {
        Counter state = new();
        await using ServiceProvider sp = BuildServices(state);
        ISender sender = sp.GetRequiredService<ISender>();

        Result<string> result = await sender.Send(new CreateItemCommand("Valid Title"));

        Assert.True(result.IsSuccess);
        Assert.Equal("Valid Title", result.Value);
        Assert.Equal(1, state.HandlerCalls);
    }

    private static ServiceProvider BuildServices(Counter counter)
    {
        ServiceCollection services = new();
        services.AddLogging();
        services.AddSingleton(counter);
        services.AddBuildingBlocksInfrastructure(typeof(ValidationBehaviorTests).Assembly);
        return services.BuildServiceProvider();
    }

    internal sealed class Counter
    {
        public int HandlerCalls { get; set; }
    }

    internal sealed record CreateItemCommand(string Title) : ICommand<string>;

    internal sealed class CreateItemValidator : AbstractValidator<CreateItemCommand>
    {
        public CreateItemValidator()
        {
            RuleFor(x => x.Title).NotEmpty().WithMessage("Tieu de khong duoc de trong.");
        }
    }

    internal sealed class CreateItemHandler(Counter counter) : ICommandHandler<CreateItemCommand, string>
    {
        public Task<Result<string>> Handle(CreateItemCommand request, CancellationToken cancellationToken)
        {
            counter.HandlerCalls++;
            return Task.FromResult(Result.Success(request.Title));
        }
    }

    internal sealed record PingCommand(string Target) : ICommand;

    internal sealed class PingValidator : AbstractValidator<PingCommand>
    {
        public PingValidator()
        {
            RuleFor(x => x.Target).NotEmpty();
        }
    }

    internal sealed class PingHandler(Counter counter) : ICommandHandler<PingCommand>
    {
        public Task<Result> Handle(PingCommand request, CancellationToken cancellationToken)
        {
            counter.HandlerCalls++;
            return Task.FromResult(Result.Success());
        }
    }
}
