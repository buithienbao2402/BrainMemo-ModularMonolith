using BrainMemo.Messaging.Application.Abstractions;
using BrainMemo.Messaging.Domain.Entities;
using BrainMemo.SharedKernel.Pagination;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Messaging.Infrastructure.Persistence;

public sealed class MessagingRepository(MessagingDbContext dbContext) : IMessagingRepository
{
    public Task<Conversation?> GetConversationByIdAsync(Guid conversationId, CancellationToken ct = default) =>
        dbContext.Conversations.FirstOrDefaultAsync(c => c.Id == conversationId, ct);

    public Task<Conversation?> FindConversationAsync(
        Guid courseId,
        Guid studentUserId,
        Guid instructorUserId,
        CancellationToken ct = default) =>
        dbContext.Conversations.FirstOrDefaultAsync(
            c => c.CourseId == courseId && c.StudentUserId == studentUserId && c.InstructorUserId == instructorUserId,
            ct);

    public async Task AddConversationAsync(Conversation conversation, CancellationToken ct = default) =>
        await dbContext.Conversations.AddAsync(conversation, ct).ConfigureAwait(false);

    public async Task<PagedResult<Conversation>> ListUserConversationsAsync(
        Guid userId,
        Guid? courseId,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        IQueryable<Conversation> query = dbContext.Conversations
            .AsNoTracking()
            .Where(c => c.StudentUserId == userId || c.InstructorUserId == userId);

        if (courseId.HasValue)
        {
            query = query.Where(c => c.CourseId == courseId.Value);
        }

        query = query.OrderByDescending(c => c.LastMessageAt);

        int total = await query.CountAsync(ct).ConfigureAwait(false);
        List<Conversation> items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return new PagedResult<Conversation>(items, page, pageSize, total);
    }

    public async Task AddMessageAsync(Message message, CancellationToken ct = default) =>
        await dbContext.Messages.AddAsync(message, ct).ConfigureAwait(false);

    public async Task<PagedResult<Message>> ListMessagesAsync(
        Guid conversationId,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        IQueryable<Message> query = dbContext.Messages
            .AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .OrderByDescending(m => m.CreatedAt);

        int total = await query.CountAsync(ct).ConfigureAwait(false);
        List<Message> items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        // Return chronological order for UI display
        items.Reverse();
        return new PagedResult<Message>(items, page, pageSize, total);
    }

    public Task<int> CountUnreadInConversationAsync(Guid conversationId, Guid viewerUserId, CancellationToken ct = default) =>
        dbContext.Messages.CountAsync(
            m => m.ConversationId == conversationId && m.SenderUserId != viewerUserId && m.ReadAt == null,
            ct);

    public async Task<int> CountTotalUnreadAsync(Guid userId, CancellationToken ct = default)
    {
        var userConvIds = dbContext.Conversations
            .Where(c => c.StudentUserId == userId || c.InstructorUserId == userId)
            .Select(c => c.Id);

        return await dbContext.Messages
            .CountAsync(m => userConvIds.Contains(m.ConversationId) && m.SenderUserId != userId && m.ReadAt == null, ct)
            .ConfigureAwait(false);
    }

    public async Task MarkConversationMessagesReadAsync(
        Guid conversationId,
        Guid viewerUserId,
        DateTimeOffset readAt,
        CancellationToken ct = default)
    {
        List<Message> unread = await dbContext.Messages
            .Where(m => m.ConversationId == conversationId && m.SenderUserId != viewerUserId && m.ReadAt == null)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        foreach (Message m in unread)
        {
            m.MarkRead(readAt);
        }
    }

    public Task SaveChangesAsync(CancellationToken ct = default) =>
        dbContext.SaveChangesAsync(ct);
}
