using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Assessment.Domain.Entities;

public class CourseReview : AggregateRoot
{
    private CourseReview() { }

    public CourseReview(
        Guid id,
        Guid courseId,
        Guid userId,
        int rating,
        string? commentText)
        : base(id)
    {
        if (rating < 1 || rating > 5)
            throw new ArgumentOutOfRangeException(nameof(rating), "Đánh giá phải từ 1 đến 5 sao.");

        CourseId = courseId;
        UserId = userId;
        Rating = rating;
        CommentText = commentText;
        CreatedAt = DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public Guid CourseId { get; private set; }
    public Guid UserId { get; private set; }
    public int Rating { get; private set; }
    public string? CommentText { get; private set; }
    public string? ReplyText { get; private set; }
    public DateTimeOffset? RepliedAt { get; private set; }
    public Guid? RepliedByUserId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void UpdateReview(int rating, string? commentText)
    {
        if (rating < 1 || rating > 5)
            throw new ArgumentOutOfRangeException(nameof(rating), "Đánh giá phải từ 1 đến 5 sao.");

        Rating = rating;
        CommentText = commentText;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Reply(string replyText, Guid instructorUserId)
    {
        if (string.IsNullOrWhiteSpace(replyText))
            throw new ArgumentException("Nội dung phản hồi không được để trống.", nameof(replyText));

        ReplyText = replyText;
        RepliedByUserId = instructorUserId;
        RepliedAt = DateTimeOffset.UtcNow;
        UpdatedAt = RepliedAt.Value;
    }
}
