using FluentValidation;

namespace BrainMemo.Identity.Application.Auth.Commands.VerifyEmail;

public sealed class VerifyEmailCommandValidator : AbstractValidator<VerifyEmailCommand>
{
    public const int MaxTokenLength = 512;

    public VerifyEmailCommandValidator()
    {
        RuleFor(x => x.Token)
            .Cascade(CascadeMode.Stop)
            .Must(token => !string.IsNullOrWhiteSpace(token))
            .WithMessage("Token xác minh email không được để trống.")
            .Must(token => token!.Trim().Length <= MaxTokenLength)
            .WithMessage("Token xác minh email không hợp lệ.");
    }
}
