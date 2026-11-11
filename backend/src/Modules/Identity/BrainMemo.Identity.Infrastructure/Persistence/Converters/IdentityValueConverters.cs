using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BrainMemo.Identity.Infrastructure.Persistence.Converters;

/// <summary>
/// Converts <see cref="Guid"/> to big-endian 16-byte RFC 4122 bytes matching MySQL <c>UUID_TO_BIN(uuid)</c>.
/// </summary>
internal sealed class BigEndianGuidBytesConverter()
    : ValueConverter<Guid, byte[]>(
        guid => guid.ToByteArray(true),
        bytes => new Guid(bytes, true));

/// <summary>
/// Nullable counterpart of <see cref="BigEndianGuidBytesConverter"/> for optional <c>BINARY(16)</c> columns.
/// </summary>
internal sealed class NullableBigEndianGuidBytesConverter()
    : ValueConverter<Guid?, byte[]?>(
        guid => guid.HasValue ? guid.Value.ToByteArray(true) : null,
        bytes => bytes == null ? null : new Guid(bytes, true));

/// <summary>
/// Converts UTC <see cref="DateTimeOffset"/> values to and from MySQL <c>DATETIME(3)</c> (always UTC).
/// </summary>
internal sealed class UtcDateTimeOffsetConverter()
    : ValueConverter<DateTimeOffset, DateTime>(
        value => value.UtcDateTime,
        dt => new DateTimeOffset(DateTime.SpecifyKind(dt, DateTimeKind.Utc)));

/// <summary>
/// Nullable counterpart of <see cref="UtcDateTimeOffsetConverter"/>.
/// </summary>
internal sealed class NullableUtcDateTimeOffsetConverter()
    : ValueConverter<DateTimeOffset?, DateTime?>(
        value => value.HasValue ? value.Value.UtcDateTime : null,
        dt => dt.HasValue ? new DateTimeOffset(DateTime.SpecifyKind(dt.Value, DateTimeKind.Utc)) : null);

