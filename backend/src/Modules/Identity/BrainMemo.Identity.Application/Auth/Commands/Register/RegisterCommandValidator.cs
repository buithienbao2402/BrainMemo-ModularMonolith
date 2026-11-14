using BrainMemo.Identity.Domain.ValueObjects;
using BrainMemo.SharedKernel.Results;
using FluentValidation;

namespace BrainMemo.Identity.Application.Auth.Commands.Register;

public sealed class RegisterCommandValidator : AbstractValidator<RegisterCommand>
{
    public const int MinPasswordLength = 8;
    public const int MaxPasswordLength = 128;

    public RegisterCommandValidator()
    {
        RuleFor(x => x.Email)
            .Cascade(CascadeMode.Stop)
            .Must(email => !string.IsNullOrWhiteSpace(email))
            .WithMessage("Email không được để trống.")
            .Custom((email, context) =>
            {
                Result<EmailAddress> result = EmailAddress.Create(email);
                if (result.IsFailure)
                {
                    context.AddFailure(result.Error.Message);
                }
            });

        RuleFor(x => x.Password)
            .Cascade(CascadeMode.Stop)
            .Must(password => !string.IsNullOrWhiteSpace(password))
            .WithMessage("Mật khẩu không được để trống.")
            .Must(password => password!.Length >= MinPasswordLength)
            .WithMessage($"Mật khẩu phải có ít nhất {MinPasswordLength} ký tự.")
            .Must(password => password!.Length <= MaxPasswordLength)
            .WithMessage($"Mật khẩu không được vượt quá {MaxPasswordLength} ký tự.");

        RuleFor(x => x.DisplayName)
            .MaximumLength(100)
            .WithMessage("Tên hiển thị không được vượt quá 100 ký tự.")
            .When(x => !string.IsNullOrEmpty(x.DisplayName));
    }
}
