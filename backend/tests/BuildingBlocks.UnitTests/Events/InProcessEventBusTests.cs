using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.BuildingBlocks.Infrastructure;
using BrainMemo.SharedKernel.Events;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BuildingBlocks.UnitTests.Events;

public sealed class InProcessEventBusTests
{
    [Fact]
    public async Task Publish_DispatchesConcreteRuntimeEventTypeToAllHandlers()
    {
        List<string> invoked = [];
        ServiceCollection services = new();
        services.AddLogging();
        services.AddSingleton(invoked);
        services.AddBuildingBlocksInfrastructure(typeof(InProcessEventBusTests).Assembly);
        services.AddScoped<IIntegrationEventHandler<SampleCreatedEvent>, HandlerA>();
        services.AddScoped<IIntegrationEventHandler<SampleCreatedEvent>, HandlerB>();

        await using ServiceProvider sp = services.BuildServiceProvider();
        using IServiceScope scope = sp.CreateScope();
        IEventBus bus = scope.ServiceProvider.GetRequiredService<IEventBus>();

        IntegrationEvent evt = new SampleCreatedEvent(UuidV7.NewGuid(), DateTimeOffset.UtcNow, "demo");
        await bus.Publish(evt);

        Assert.Equal(["HandlerA:demo", "HandlerB:demo"], invoked);
    }

    [Fact]
    public async Task Publish_WithZeroHandlers_CompletesWithoutError()
    {
        ServiceCollection services = new();
        services.AddLogging();
        services.AddBuildingBlocksInfrastructure(typeof(InProcessEventBusTests).Assembly);

        await using ServiceProvider sp = services.BuildServiceProvider();
        using IServiceScope scope = sp.CreateScope();
        IEventBus bus = scope.ServiceProvider.GetRequiredService<IEventBus>();

        await bus.Publish(new SampleCreatedEvent(UuidV7.NewGuid(), DateTimeOffset.UtcNow, "nobody"));
    }

    public sealed record SampleCreatedEvent(Guid EventId, DateTimeOffset OccurredAt, string Name)
        : IntegrationEvent(EventId, OccurredAt);

    private sealed class HandlerA(List<string> invoked) : IIntegrationEventHandler<SampleCreatedEvent>
    {
        public Task HandleAsync(SampleCreatedEvent @event, CancellationToken ct = default)
        {
            invoked.Add($"HandlerA:{@event.Name}");
            return Task.CompletedTask;
        }
    }

    private sealed class HandlerB(List<string> invoked) : IIntegrationEventHandler<SampleCreatedEvent>
    {
        public Task HandleAsync(SampleCreatedEvent @event, CancellationToken ct = default)
        {
            invoked.Add($"HandlerB:{@event.Name}");
            return Task.CompletedTask;
        }
    }
}
