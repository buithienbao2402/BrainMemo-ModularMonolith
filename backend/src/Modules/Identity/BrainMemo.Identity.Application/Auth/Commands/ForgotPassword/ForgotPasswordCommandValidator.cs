using BrainMemo.Identity.Domain.ValueObjects;
using BrainMemo.SharedKernel.Results;
using FluentValidation;

namespace BrainMemo.Identity.Application.Auth.Commands.ForgotPassword;

public sealed class ForgotPasswordCommandValidator : AbstractValidator<ForgotPasswordCommand>
{
    public ForgotPasswordCommandValidator()
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
    }
}
