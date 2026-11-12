using BrainMemo.Identity.Application.Options;
using Microsoft.Extensions.Options;

namespace BrainMemo.Identity.Infrastructure.Options;

internal sealed class IdentityOptionsValidator : IValidateOptions<IdentityOptions>
{
    public ValidateOptionsResult Validate(string? name, IdentityOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        List<string> failures = [];

        if (options.EmailVerificationTokenTtl <= TimeSpan.Zero)
        {
            failures.Add("Identity:EmailVerificationTokenTtl must be greater than zero.");
        }

        if (options.PasswordResetTokenTtl <= TimeSpan.Zero)
        {
            failures.Add("Identity:PasswordResetTokenTtl must be greater than zero.");
        }

        return failures.Count == 0
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail(failures);
    }
}
