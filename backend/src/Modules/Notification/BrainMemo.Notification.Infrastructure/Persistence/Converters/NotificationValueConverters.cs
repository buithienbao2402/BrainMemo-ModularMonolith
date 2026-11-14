using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BrainMemo.Notification.Infrastructure.Persistence.Converters;

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
