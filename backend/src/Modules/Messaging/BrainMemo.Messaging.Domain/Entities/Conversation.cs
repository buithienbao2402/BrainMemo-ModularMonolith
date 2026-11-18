using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Messaging.Domain.Entities;

public sealed class Conversation : AggregateRoot
{
    private readonly List<Message> _messages = [];

    private Conversation()
    {
    }

    public Conversation(
        Guid id,
        Guid courseId,
        Guid studentUserId,
        Guid instructorUserId,
        DateTimeOffset now) : base(id)
    {
        CourseId = courseId;
        StudentUserId = studentUserId;
        InstructorUserId = instructorUserId;
        LastMessageAt = now;
        CreatedAt = now;
        UpdatedAt = now;
    }

    public Guid CourseId { get; private set; }
    public Guid StudentUserId { get; private set; }
    public Guid InstructorUserId { get; private set; }
    public DateTimeOffset LastMessageAt { get; private set; }
    public string? LastMessagePreview { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public IReadOnlyCollection<Message> Messages => _messages.AsReadOnly();

    public bool IsParticipant(Guid userId) => userId == StudentUserId || userId == InstructorUserId;

    public Guid GetOtherParticipant(Guid userId) => userId == StudentUserId ? InstructorUserId : StudentUserId;

    public void RecordNewMessage(string content, DateTimeOffset now)
    {
        string trimmed = content.Trim();
        LastMessagePreview = trimmed.Length > 250 ? trimmed[..250] + "..." : trimmed;
        LastMessageAt = now;
        UpdatedAt = now;
    }
}
