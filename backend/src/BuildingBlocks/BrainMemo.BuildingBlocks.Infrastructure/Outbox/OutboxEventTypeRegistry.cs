using System.Collections.Concurrent;
using System.Reflection;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.SharedKernel.Events;

namespace BrainMemo.BuildingBlocks.Infrastructure.Outbox;

public interface IOutboxEventTypeRegistry
{
    string GetEventTypeName(Type eventType);

    Type? Resolve(string eventType);

    void Register<TEvent>(string? eventTypeName = null)
        where TEvent : IntegrationEvent;

    void RegisterAssembly(Assembly assembly);
}

/// <summary>
/// Resolves short <c>event_type</c> names stored in outbox tables back to concrete <see cref="IntegrationEvent"/> CLR types.
/// </summary>
public sealed class OutboxEventTypeRegistry : IOutboxEventTypeRegistry
{
    private readonly ConcurrentDictionary<string, Type> _byName = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<Type, string> _typeToName = new();
    private readonly ConcurrentDictionary<Assembly, byte> _scannedAssemblies = new();
    private readonly object _syncLock = new();

    public OutboxEventTypeRegistry(IEnumerable<Assembly>? initialAssemblies = null)
    {
        if (initialAssemblies is not null)
        {
            foreach (Assembly assembly in initialAssemblies)
            {
                RegisterAssembly(assembly);
            }
        }
    }

    public string GetEventTypeName(Type eventType)
    {
        ArgumentNullException.ThrowIfNull(eventType);

        if (!typeof(IntegrationEvent).IsAssignableFrom(eventType) || eventType.IsAbstract)
        {
            throw new ArgumentException(
                $"Type '{eventType.FullName}' must be a concrete IntegrationEvent.",
                nameof(eventType));
        }

        string resolvedName = _typeToName.GetOrAdd(eventType, static type =>
        {
            OutboxEventNameAttribute? attr = type.GetCustomAttribute<OutboxEventNameAttribute>(inherit: false);
            string name = attr?.EventType ?? type.Name;
            if (name.Length > OutboxMessage.MaxEventTypeLength)
            {
                throw new ArgumentException(
                    $"Outbox event_type '{name}' exceeds {OutboxMessage.MaxEventTypeLength} characters.",
                    nameof(eventType));
            }

            return name;
        });

        RegisterMapping(resolvedName, eventType);
        return resolvedName;
    }

    public Type? Resolve(string eventType)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(eventType);
        string normalized = eventType.Trim();

        if (TryLookup(normalized, out Type? found))
        {
            return found;
        }

        ScanRelevantLoadedAssemblies();

        return TryLookup(normalized, out found) ? found : null;
    }

    public void Register<TEvent>(string? eventTypeName = null)
        where TEvent : IntegrationEvent
    {
        Type type = typeof(TEvent);
        string name = string.IsNullOrWhiteSpace(eventTypeName)
            ? GetEventTypeName(type)
            : eventTypeName.Trim();

        if (name.Length > OutboxMessage.MaxEventTypeLength)
        {
            throw new ArgumentException(
                $"Outbox event_type '{name}' exceeds {OutboxMessage.MaxEventTypeLength} characters.",
                nameof(eventTypeName));
        }

        _typeToName[type] = name;
        _byName[name] = type;
        RegisterAliases(name, type);
    }

    public void RegisterAssembly(Assembly assembly)
    {
        ArgumentNullException.ThrowIfNull(assembly);

        if (assembly.IsDynamic || !_scannedAssemblies.TryAdd(assembly, 0))
        {
            return;
        }

        foreach (Type type in GetLoadableTypes(assembly))
        {
            if (type.IsAbstract || !typeof(IntegrationEvent).IsAssignableFrom(type))
            {
                continue;
            }

            string name = GetCanonicalName(type);
            if (name.Length <= OutboxMessage.MaxEventTypeLength)
            {
                _typeToName.TryAdd(type, name);
                RegisterMapping(name, type);
            }
        }
    }

    private bool TryLookup(string normalized, out Type? found)
    {
        if (_byName.TryGetValue(normalized, out found))
        {
            return true;
        }

        if (!normalized.EndsWith("Event", StringComparison.OrdinalIgnoreCase)
            && _byName.TryGetValue($"{normalized}Event", out found))
        {
            return true;
        }

        if (normalized.EndsWith("Event", StringComparison.OrdinalIgnoreCase)
            && normalized.Length > 5
            && _byName.TryGetValue(normalized[..^5], out found))
        {
            return true;
        }

        return false;
    }

    private void RegisterMapping(string name, Type type)
    {
        _byName.TryAdd(name, type);
        RegisterAliases(name, type);
    }

    private void RegisterAliases(string name, Type type)
    {
        if (name.EndsWith("Event", StringComparison.OrdinalIgnoreCase) && name.Length > 5)
        {
            _byName.TryAdd(name[..^5], type);
        }
    }

    private void ScanRelevantLoadedAssemblies()
    {
        lock (_syncLock)
        {
            Queue<Assembly> pending = new(
                AppDomain.CurrentDomain.GetAssemblies().Where(IsBrainMemoAssembly));

            while (pending.Count > 0)
            {
                Assembly assembly = pending.Dequeue();
                bool isNew = !_scannedAssemblies.ContainsKey(assembly);
                RegisterAssembly(assembly);

                if (!isNew || assembly.IsDynamic)
                {
                    continue;
                }

                foreach (AssemblyName referenced in assembly.GetReferencedAssemblies())
                {
                    if (referenced.Name is null
                        || !referenced.Name.StartsWith("BrainMemo.", StringComparison.Ordinal))
                    {
                        continue;
                    }

                    try
                    {
                        Assembly loaded = Assembly.Load(referenced);
                        if (!_scannedAssemblies.ContainsKey(loaded))
                        {
                            pending.Enqueue(loaded);
                        }
                    }
                    catch (Exception ex) when (ex is IOException or BadImageFormatException)
                    {
                        // Ignore optional assemblies that cannot be resolved at runtime.
                    }
                }
            }
        }
    }

    private static bool IsBrainMemoAssembly(Assembly assembly)
    {
        string? name = assembly.GetName().Name;
        return !string.IsNullOrWhiteSpace(name)
            && name.StartsWith("BrainMemo.", StringComparison.Ordinal);
    }

    private static string GetCanonicalName(Type type)
    {
        OutboxEventNameAttribute? attr = type.GetCustomAttribute<OutboxEventNameAttribute>(inherit: false);
        return attr?.EventType ?? type.Name;
    }

    private static IEnumerable<Type> GetLoadableTypes(Assembly assembly)
    {
        try
        {
            return assembly.GetTypes();
        }
        catch (ReflectionTypeLoadException ex)
        {
            return ex.Types.Where(type => type is not null)!;
        }
    }
}
