using System.Security.Claims;
using BrainMemo.Identity.Contracts;
using BrainMemo.SharedKernel.Results;
using BrainMemo.WebApi.Errors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace BrainMemo.WebApi.Security;

/// <summary>
/// Enforces account status checks on all authenticated API requests (DEC-19 &amp; DAC_TA §3.1.1).
/// Blocks locked accounts with 403 ProblemDetails including lockedUntil and lockReason extensions.
/// </summary>
public sealed class AccountStatusMiddleware(
    RequestDelegate next,
    IConfiguration configuration)
{
    public async Task InvokeAsync(HttpContext context, IIdentityContract identityContract)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(identityContract);

        if (context.GetEndpoint()?.Metadata.GetMetadata<IAllowAnonymous>() is not null)
        {
            await next(context).ConfigureAwait(false);
            return;
        }

        if (context.User.Identity?.IsAuthenticated == true)
        {
            string? rawUserId = context.User.FindFirst("sub")?.Value
                ?? context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? context.User.Identity?.Name;

            if (Guid.TryParse(rawUserId, out Guid userId) && userId != Guid.Empty)
            {
                bool hasConfiguredDb = !string.IsNullOrWhiteSpace(configuration.GetConnectionString("Default"));
                bool hasCustomContract = !string.Equals(
                    identityContract.GetType().Name,
                    "IdentityContractService",
                    StringComparison.Ordinal);

                if (hasConfiguredDb || hasCustomContract)
                {
                    Result<AccountStatusDto> statusResult = await identityContract
                        .GetAccountStatus(userId, context.RequestAborted)
                        .ConfigureAwait(false);

                    if (statusResult.IsSuccess && statusResult.Value.Status != AccountStatuses.Active)
                    {
                        Dictionary<string, object?> metadata = new(StringComparer.OrdinalIgnoreCase)
                        {
                            ["lockedUntil"] = statusResult.Value.LockedUntil,
                            ["lockReason"] = statusResult.Value.LockReason,
                        };

                        Error error = new(
                            ErrorCodes.AccountLocked,
                            "Tài khoản của bạn đang bị khóa.",
                            Metadata: metadata);

                        await ProblemDetailsWriter
                            .WriteAsync(context, error, ct: context.RequestAborted)
                            .ConfigureAwait(false);
                        return;
                    }
                }
                else
                {
                    string? claimStatus = context.User.FindFirst("account_status")?.Value;
                    if (!string.IsNullOrWhiteSpace(claimStatus)
                        && !string.Equals(claimStatus, AccountStatuses.Active, StringComparison.OrdinalIgnoreCase))
                    {
                        Error error = new(
                            ErrorCodes.AccountLocked,
                            "Tài khoản của bạn đang bị khóa.");

                        await ProblemDetailsWriter
                            .WriteAsync(context, error, ct: context.RequestAborted)
                            .ConfigureAwait(false);
                        return;
                    }
                }
            }
        }

        await next(context).ConfigureAwait(false);
    }
}
