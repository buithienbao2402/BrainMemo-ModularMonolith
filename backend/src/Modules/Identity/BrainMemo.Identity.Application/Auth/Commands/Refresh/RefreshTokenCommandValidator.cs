using FluentValidation;

namespace BrainMemo.Identity.Application.Auth.Commands.Refresh;

public sealed class RefreshTokenCommandValidator : AbstractValidator<RefreshTokenCommand>
{
    public RefreshTokenCommandValidator()
    {
        RuleFor(x => x.RawRefreshToken)
            .NotEmpty().WithMessage("Refresh token không được để trống.")
            .MaximumLength(512).WithMessage("Refresh token không được vượt quá 512 ký tự.");
    }
}
