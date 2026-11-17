using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Messaging.Application.Abstractions;
using BrainMemo.Messaging.Application.DTOs;
using BrainMemo.Messaging.Contracts.Events;
using BrainMemo.Messaging.Domain.Entities;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using CourseUserRefDto = BrainMemo.Course.Contracts.Dtos.UserRefDto;
using MsgUserRefDto = BrainMemo.Messaging.Application.DTOs.MessagingUserRefDto;

namespace BrainMemo.Messaging.Application.Commands;

public sealed record OpenOrCreateConversationCommand(Guid CourseId, Guid StudentUserId) : ICommand<ConversationDto>;
public sealed record SendMessageCommand(Guid ConversationId, Guid SenderUserId, string Content, string? AttachmentUploadKey) : ICommand<MessageDto>;
public sealed record MarkConversationReadCommand(Guid ConversationId, Guid ViewerUserId) : ICommand;

public sealed class MessagingCommandHandler(
    IMessagingRepository repository,
    ICourseContract courseContract,
    IProfileContract profileContract,
    IEventBus eventBus,
    IClock clock)
    : ICommandHandler<OpenOrCreateConversationCommand, ConversationDto>,
      ICommandHandler<SendMessageCommand, MessageDto>,
      ICommandHandler<MarkConversationReadCommand>
{
    public async Task<Result<ConversationDto>> Handle(OpenOrCreateConversationCommand request, CancellationToken ct)
    {
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(request.CourseId, request.StudentUserId);
        if (accessResult.IsFailure)
        {
            return Result.Failure<ConversationDto>(accessResult.Error);
        }

        CourseAccessDto access = accessResult.Value;
        if (!access.Exists || !access.CanViewInfo)
        {
            return Result.Failure<ConversationDto>(Error.NotFound("Không tìm thấy khóa học."));
        }

        if (access.IsOwner)
        {
            return Result.Failure<ConversationDto>(Error.Validation("Chủ khóa không thể tự mở hội thoại với chính mình."));
        }

        bool isActiveLearner = string.Equals(access.EnrollmentStatus, "ACTIVE", StringComparison.OrdinalIgnoreCase);
        if (!isActiveLearner)
        {
            return Result.Failure<ConversationDto>(Error.Forbidden("Bạn cần ghi danh vào khóa học để nhắn tin với giảng viên."));
        }

        Conversation? conversation = await repository
            .FindConversationAsync(request.CourseId, request.StudentUserId, access.OwnerUserId, ct)
            .ConfigureAwait(false);

        DateTimeOffset now = clock.UtcNow;
        if (conversation is null)
        {
            conversation = new Conversation(
                Guid.NewGuid(),
                request.CourseId,
                request.StudentUserId,
                access.OwnerUserId,
                now);
            await repository.AddConversationAsync(conversation, ct).ConfigureAwait(false);
            await repository.SaveChangesAsync(ct).ConfigureAwait(false);
        }

        int unreadCount = await repository.CountUnreadInConversationAsync(conversation.Id, request.StudentUserId, ct).ConfigureAwait(false);
        return Result.Success(await BuildConversationDtoAsync(conversation, unreadCount, ct).ConfigureAwait(false));
    }

    public async Task<Result<MessageDto>> Handle(SendMessageCommand request, CancellationToken ct)
    {
        Conversation? conversation = await repository.GetConversationByIdAsync(request.ConversationId, ct).ConfigureAwait(false);
        if (conversation is null)
        {
            return Result.Failure<MessageDto>(Error.NotFound("Không tìm thấy cuộc trò chuyện."));
        }

        if (!conversation.IsParticipant(request.SenderUserId))
        {
            return Result.Failure<MessageDto>(Error.Forbidden("Bạn không có quyền tham gia cuộc trò chuyện này."));
        }

        DateTimeOffset now = clock.UtcNow;
        Result<Message> messageResult = Message.Create(
            Guid.NewGuid(),
            conversation.Id,
            request.SenderUserId,
            request.Content,
            request.AttachmentUploadKey,
            now);

        if (messageResult.IsFailure)
        {
            return Result.Failure<MessageDto>(messageResult.Error);
        }

        Message message = messageResult.Value;
        conversation.RecordNewMessage(message.Content, now);

        await repository.AddMessageAsync(message, ct).ConfigureAwait(false);
        await repository.SaveChangesAsync(ct).ConfigureAwait(false);

        await eventBus.Publish(new NewMessageReceived(
            EventId: Guid.NewGuid(),
            OccurredAt: now,
            ConversationId: conversation.Id,
            MessageId: message.Id,
            CourseId: conversation.CourseId,
            SenderUserId: message.SenderUserId,
            RecipientUserId: conversation.GetOtherParticipant(message.SenderUserId),
            Preview: conversation.LastMessagePreview ?? string.Empty), ct).ConfigureAwait(false);

        return Result.Success(new MessageDto(
            message.Id,
            message.ConversationId,
            message.SenderUserId,
            message.Content,
            null,
            message.ReadAt,
            message.CreatedAt));
    }

    public async Task<Result> Handle(MarkConversationReadCommand request, CancellationToken ct)
    {
        Conversation? conversation = await repository.GetConversationByIdAsync(request.ConversationId, ct).ConfigureAwait(false);
        if (conversation is null)
        {
            return Result.Failure(Error.NotFound("Không tìm thấy cuộc trò chuyện."));
        }

        if (!conversation.IsParticipant(request.ViewerUserId))
        {
            return Result.Failure(Error.Forbidden("Bạn không có quyền truy cập cuộc trò chuyện này."));
        }

        await repository.MarkConversationMessagesReadAsync(conversation.Id, request.ViewerUserId, clock.UtcNow, ct).ConfigureAwait(false);
        await repository.SaveChangesAsync(ct).ConfigureAwait(false);
        return Result.Success();
    }

    private async Task<ConversationDto> BuildConversationDtoAsync(Conversation conv, int unreadCount, CancellationToken ct)
    {
        string courseName = "Khóa học";
        Result<IReadOnlyList<CourseSummaryDto>> summaries = courseContract.GetCourseSummaries([conv.CourseId], conv.StudentUserId);
        if (summaries.IsSuccess && summaries.Value.Count > 0 && !string.IsNullOrWhiteSpace(summaries.Value[0].Name))
        {
            courseName = summaries.Value[0].Name!;
        }

        Dictionary<Guid, MsgUserRefDto> profiles = new();
        Result<IReadOnlyList<DisplayInfoDto>> infoResult = await profileContract
            .GetDisplayInfo([conv.StudentUserId, conv.InstructorUserId], ct)
            .ConfigureAwait(false);

        if (infoResult.IsSuccess)
        {
            foreach (DisplayInfoDto info in infoResult.Value)
            {
                profiles[info.UserId] = new MsgUserRefDto(info.UserId, info.DisplayName, info.AvatarUrl);
            }
        }

        MsgUserRefDto studentRef = profiles.GetValueOrDefault(conv.StudentUserId)
            ?? new MsgUserRefDto(conv.StudentUserId, "Học viên", null);
        MsgUserRefDto instructorRef = profiles.GetValueOrDefault(conv.InstructorUserId)
            ?? new MsgUserRefDto(conv.InstructorUserId, "Giảng viên", null);

        return new ConversationDto(
            conv.Id,
            conv.CourseId,
            courseName,
            studentRef,
            instructorRef,
            conv.LastMessageAt,
            conv.LastMessagePreview,
            unreadCount,
            conv.CreatedAt);
    }
}
