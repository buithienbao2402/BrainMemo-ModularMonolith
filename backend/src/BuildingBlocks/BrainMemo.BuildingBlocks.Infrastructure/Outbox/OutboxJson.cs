using System.Text.Json;
using System.Text.Json.Serialization;
using BrainMemo.SharedKernel.Events;

namespace BrainMemo.BuildingBlocks.Infrastructure.Outbox;

internal static class OutboxJson
{
    public static readonly JsonSerializerOptions SerializerOptions = CreateOptions();

    public static string Serialize(IntegrationEvent @event)
    {
        ArgumentNullException.ThrowIfNull(@event);
        return JsonSerializer.Serialize(@event, @event.GetType(), SerializerOptions);
    }

    public static IntegrationEvent Deserialize(string payload, Type eventType)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(payload);
        ArgumentNullException.ThrowIfNull(eventType);

        if (JsonSerializer.Deserialize(payload, eventType, SerializerOptions) is not IntegrationEvent @event)
        {
            throw new InvalidOperationException(
                $"Failed to deserialize outbox payload into '{eventType.FullName}'.");
        }

        return @event;
    }

    private static JsonSerializerOptions CreateOptions()
    {
        JsonSerializerOptions options = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
        };
        options.Converters.Add(new JsonStringEnumConverter());
        return options;
    }
}
