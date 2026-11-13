using FluentValidation;

namespace BrainMemo.Identity.Application.Auth.Commands.ChangePassword;

public sealed class ChangePasswordCommandValidator : AbstractValidator<ChangePasswordCommand>
{
    public const int MinPasswordLength = 8;
    public const int MaxPasswordLength = 128;

    public ChangePasswordCommandValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("ID người dùng không được để trống.");

        RuleFor(x => x.CurrentPassword)
            .Cascade(CascadeMode.Stop)
            .Must(p => !string.IsNullOrWhiteSpace(p))
            .WithMessage("Mật khẩu hiện tại không được để trống.");

        RuleFor(x => x.NewPassword)
            .Cascade(CascadeMode.Stop)
            .Must(p => !string.IsNullOrWhiteSpace(p))
            .WithMessage("Mật khẩu mới không được để trống.")
            .Must(p => p!.Length >= MinPasswordLength)
            .WithMessage($"Mật khẩu phải có ít nhất {MinPasswordLength} ký tự.")
            .Must(p => p!.Length <= MaxPasswordLength)
            .WithMessage($"Mật khẩu không được vượt quá {MaxPasswordLength} ký tự.");
    }
}
