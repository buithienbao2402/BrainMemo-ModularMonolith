using BrainMemo.Profile.Domain.Entities;
using FluentValidation;

namespace BrainMemo.Profile.Application.Commands.UpdateMyProfile;

public sealed class UpdateMyProfileCommandValidator : AbstractValidator<UpdateMyProfileCommand>
{
    public UpdateMyProfileCommandValidator()
    {
        RuleFor(x => x.DisplayName)
            .MaximumLength(UserProfile.MaxDisplayNameLength).WithMessage($"Tên hiển thị không được vượt quá {UserProfile.MaxDisplayNameLength} ký tự.")
            .Must(name => !string.IsNullOrWhiteSpace(name)).WithMessage("Tên hiển thị không được để trống.")
            .When(x => x.DisplayName is not null);

        RuleFor(x => x.Bio)
            .MaximumLength(UserProfile.MaxBioLength).WithMessage($"Giới thiệu không được vượt quá {UserProfile.MaxBioLength} ký tự.")
            .When(x => x.Bio is not null);

        RuleFor(x => x.UiTheme)
            .Must(t => string.Equals(t, "LIGHT", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(t, "DARK", StringComparison.OrdinalIgnoreCase))
            .WithMessage("Giao diện phải là LIGHT hoặc DARK.")
            .When(x => !string.IsNullOrEmpty(x.UiTheme));
    }
}
