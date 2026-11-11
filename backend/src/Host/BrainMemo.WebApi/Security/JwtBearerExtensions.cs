using System.Security.Cryptography;
using System.Text;
using BrainMemo.SharedKernel.Results;
using BrainMemo.WebApi.Errors;
using BrainMemo.WebApi.Options;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace BrainMemo.WebApi.Security;

public static class JwtBearerExtensions
{
    public static IServiceCollection AddBrainMemoJwtAuthentication(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);
        ArgumentNullException.ThrowIfNull(environment);

        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName));

        services
            .AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer();

        services
            .AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtOptions>, IHostEnvironment>((options, jwtAccessor, env) =>
            {
                JwtOptions jwtOptions = jwtAccessor.Value;
                byte[] keyBytes = ResolveSigningKeyBytes(jwtOptions.SigningKey, env);
                SymmetricSecurityKey signingKey = new(keyBytes);

                options.MapInboundClaims = false;
                options.RequireHttpsMetadata = !env.IsDevelopment() && !env.IsEnvironment("Testing");
                options.SaveToken = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwtOptions.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwtOptions.Audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = signingKey,
                    NameClaimType = "sub",
                    RoleClaimType = "role",
                };

                options.Events = new JwtBearerEvents
                {
                    OnChallenge = async context =>
                    {
                        context.HandleResponse();
                        (_, string title) = ErrorCodeMapper.Resolve(ErrorCodes.Unauthenticated);
                        await ProblemDetailsWriter
                            .WriteAsync(context.HttpContext, new Error(ErrorCodes.Unauthenticated, title))
                            .ConfigureAwait(false);
                    },
                    OnForbidden = async context =>
                    {
                        (_, string title) = ErrorCodeMapper.Resolve(ErrorCodes.Forbidden);
                        await ProblemDetailsWriter
                            .WriteAsync(context.HttpContext, new Error(ErrorCodes.Forbidden, title))
                            .ConfigureAwait(false);
                    },
                };
            });

        services.AddAuthorization();

        return services;
    }

    private static byte[] ResolveSigningKeyBytes(string? configuredKey, IHostEnvironment environment)
    {
        if (!string.IsNullOrWhiteSpace(configuredKey) && configuredKey.Length >= 32)
        {
            return Encoding.UTF8.GetBytes(configuredKey);
        }

        if (environment.IsDevelopment() || environment.IsEnvironment("Testing"))
        {
            // Ephemeral per-process dev key avoids committing secrets while letting /health and host tests boot cleanly.
            return RandomNumberGenerator.GetBytes(32);
        }

        throw new InvalidOperationException(
            "Jwt:SigningKey must be configured and at least 32 characters long outside Development/Testing.");
    }
}
