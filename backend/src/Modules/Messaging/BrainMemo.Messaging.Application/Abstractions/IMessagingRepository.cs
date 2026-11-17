using BrainMemo.Messaging.Domain.Entities;
using BrainMemo.SharedKernel.Pagination;

namespace BrainMemo.Messaging.Application.Abstractions;

public interface IMessagingRepository
{
    Task<Conversation?> GetConversationByIdAsync(Guid conversationId, CancellationToken ct = default);
    Task<Conversation?> FindConversationAsync(Guid courseId, Guid studentUserId, Guid instructorUserId, CancellationToken ct = default);
    Task AddConversationAsync(Conversation conversation, CancellationToken ct = default);
    Task<PagedResult<Conversation>> ListUserConversationsAsync(Guid userId, Guid? courseId, int page, int pageSize, CancellationToken ct = default);
    Task AddMessageAsync(Message message, CancellationToken ct = default);
    Task<PagedResult<Message>> ListMessagesAsync(Guid conversationId, int page, int pageSize, CancellationToken ct = default);
    Task<int> CountUnreadInConversationAsync(Guid conversationId, Guid viewerUserId, CancellationToken ct = default);
    Task<int> CountTotalUnreadAsync(Guid userId, CancellationToken ct = default);
    Task MarkConversationMessagesReadAsync(Guid conversationId, Guid viewerUserId, DateTimeOffset readAt, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
