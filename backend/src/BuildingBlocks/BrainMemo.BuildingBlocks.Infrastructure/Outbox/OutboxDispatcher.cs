using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.SharedKernel.Events;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BrainMemo.BuildingBlocks.Infrastructure.Outbox;

/// <summary>
/// Background <see cref="IHostedService"/> polling registered <see cref="IOutboxStore"/> instances
/// (Course, Learning, Assessment), dispatching committed events via <see cref="IEventBus"/>, and deduplicating by <c>EventId</c>.
/// </summary>
public sealed class OutboxDispatcher(
    IServiceScopeFactory scopeFactory,
    IOutboxEventTypeRegistry eventTypeRegistry,
    IOutboxDeliveryTracker deliveryTracker,
    IClock clock,
    IOptions<OutboxOptions> options,
    ILogger<OutboxDispatcher> logger) : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
    private readonly IOutboxEventTypeRegistry _eventTypeRegistry = eventTypeRegistry ?? throw new ArgumentNullException(nameof(eventTypeRegistry));
    private readonly IOutboxDeliveryTracker _deliveryTracker = deliveryTracker ?? throw new ArgumentNullException(nameof(deliveryTracker));
    private readonly IClock _clock = clock ?? throw new ArgumentNullException(nameof(clock));
    private readonly OutboxOptions _options = (options ?? throw new ArgumentNullException(nameof(options))).Value;
    private readonly ILogger<OutboxDispatcher> _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    private readonly SemaphoreSlim _dispatchLock = new(1, 1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("OutboxDispatcher is disabled by configuration.");
            return;
        }

        TimeSpan interval = _options.GetNormalizedPollingInterval();
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DispatchOnceAsync(stoppingToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected failure in OutboxDispatcher polling iteration.");
            }

            try
            {
                await Task.Delay(interval, stoppingToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }

    public async Task<int> DispatchOnceAsync(CancellationToken ct = default)
    {
        await _dispatchLock.WaitAsync(ct).ConfigureAwait(false);
        try
        {
            using IServiceScope scope = _scopeFactory.CreateScope();
            IOutboxStore[] stores = scope.ServiceProvider
                .GetServices<IOutboxStore>()
                .OrderBy(store => store.ModuleName, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            if (stores.Length == 0)
            {
                return 0;
            }

            IEventBus eventBus = scope.ServiceProvider.GetRequiredService<IEventBus>();
            int batchSize = _options.GetNormalizedBatchSize();
            int maxAttempts = _options.GetNormalizedMaxAttempts();
            int dispatchedCount = 0;

            foreach (IOutboxStore store in stores)
            {
                IReadOnlyList<OutboxMessage> pending = await store
                    .GetUnpublishedAsync(batchSize, maxAttempts, ct)
                    .ConfigureAwait(false);

                foreach (OutboxMessage message in pending)
                {
                    if (await ProcessMessageAsync(store, eventBus, message, ct).ConfigureAwait(false))
                    {
                        dispatchedCount++;
                    }
                }
            }

            return dispatchedCount;
        }
        finally
        {
            _dispatchLock.Release();
        }
    }

    public override void Dispose()
    {
        _dispatchLock.Dispose();
        base.Dispose();
    }

    private async Task<bool> ProcessMessageAsync(
        IOutboxStore store,
        IEventBus eventBus,
        OutboxMessage message,
        CancellationToken ct)
    {
        if (_deliveryTracker.Contains(message.Id))
        {
            _logger.LogDebug(
                "Deduplicated already-delivered outbox event {EventType} ({EventId}) in module {ModuleName}",
                message.EventType,
                message.Id,
                store.ModuleName);
            message.MarkPublished(_clock.UtcNow);
            await TryPersistPublishedAsync(store, message, ct).ConfigureAwait(false);
            return false;
        }

        try
        {
            Type eventClrType = _eventTypeRegistry.Resolve(message.EventType)
                ?? throw new InvalidOperationException(
                    $"Unknown outbox event type '{message.EventType}' for EventId '{message.Id}'.");

            IntegrationEvent @event = OutboxJson.Deserialize(message.Payload, eventClrType);
            await eventBus.Publish(@event, ct).ConfigureAwait(false);

            _deliveryTracker.MarkDelivered(message.Id);
            message.MarkPublished(_clock.UtcNow);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            string safeError = BuildSafeErrorSummary(ex);
            message.MarkFailed(safeError);

            _logger.LogWarning(
                "Outbox dispatch failed for {EventType} ({EventId}) in module {ModuleName} on attempt {AttemptCount}: {ErrorSummary}",
                message.EventType,
                message.Id,
                store.ModuleName,
                message.AttemptCount,
                safeError);

            await TryPersistFailureAsync(store, message, ct).ConfigureAwait(false);
            return false;
        }

        await TryPersistPublishedAsync(store, message, ct).ConfigureAwait(false);
        return true;
    }

    private async Task TryPersistPublishedAsync(
        IOutboxStore store,
        OutboxMessage message,
        CancellationToken ct)
    {
        try
        {
            await store.SaveChangesAsync(ct).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Event {EventType} ({EventId}) in module {ModuleName} was delivered but marking published_at failed; next tick will finalize idempotently.",
                message.EventType,
                message.Id,
                store.ModuleName);
        }
    }

    private async Task TryPersistFailureAsync(
        IOutboxStore store,
        OutboxMessage message,
        CancellationToken ct)
    {
        try
        {
            await store.SaveChangesAsync(ct).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception persistEx)
        {
            _logger.LogError(
                persistEx,
                "Failed to persist outbox failure metadata for {EventType} ({EventId}) in module {ModuleName}.",
                message.EventType,
                message.Id,
                store.ModuleName);
        }
    }

    private static string BuildSafeErrorSummary(Exception ex)
    {
        string raw = $"{ex.GetType().Name}: {ex.Message}"
            .Replace('\r', ' ')
            .Replace('\n', ' ')
            .Trim();

        return raw.Length <= OutboxMessage.MaxLastErrorLength
            ? raw
            : raw[..OutboxMessage.MaxLastErrorLength];
    }
}
