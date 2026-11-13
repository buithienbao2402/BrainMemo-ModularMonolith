using BrainMemo.Notification.Domain.Entities;
using FluentValidation;

namespace BrainMemo.Notification.Application.Commands.CreateAnnouncement;

public sealed class CreateAnnouncementCommandValidator : AbstractValidator<CreateAnnouncementCommand>
{
    public CreateAnnouncementCommandValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Tiêu đề không được để trống.")
            .MaximumLength(Announcement.MaxTitleLength).WithMessage($"Tiêu đề không được vượt quá {Announcement.MaxTitleLength} ký tự.");

        RuleFor(x => x.Body)
            .NotEmpty().WithMessage("Nội dung không được để trống.");
    }
}
