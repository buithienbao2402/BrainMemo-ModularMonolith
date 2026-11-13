using FluentValidation;

namespace BrainMemo.Identity.Application.Auth.Commands.ResetPassword;

public sealed class ResetPasswordCommandValidator : AbstractValidator<ResetPasswordCommand>
{
    public const int MaxTokenLength = 512;
    public const int MinPasswordLength = 8;
    public const int MaxPasswordLength = 128;

    public ResetPasswordCommandValidator()
    {
        RuleFor(x => x.Token)
            .Cascade(CascadeMode.Stop)
            .Must(token => !string.IsNullOrWhiteSpace(token))
            .WithMessage("Token xác thực không được để trống.")
            .Must(token => token!.Trim().Length <= MaxTokenLength)
            .WithMessage($"Độ dài token không được vượt quá {MaxTokenLength} ký tự.");

        RuleFor(x => x.NewPassword)
            .Cascade(CascadeMode.Stop)
            .Must(password => !string.IsNullOrWhiteSpace(password))
            .WithMessage("Mật khẩu mới không được để trống.")
            .Must(password => password!.Length >= MinPasswordLength)
            .WithMessage($"Mật khẩu phải có ít nhất {MinPasswordLength} ký tự.")
            .Must(password => password!.Length <= MaxPasswordLength)
            .WithMessage($"Mật khẩu không được vượt quá {MaxPasswordLength} ký tự.");
    }
}
