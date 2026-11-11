using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;

namespace BrainMemo.WebApi.Swagger;

public static class SwaggerExtensions
{
    public static IServiceCollection AddBrainMemoSwagger(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "BrainMemo LMS API",
                Version = "v1",
                Description = "BrainMemo Modular Monolith Web API (/api/v1)",
            });

            OpenApiSecurityScheme bearerScheme = new()
            {
                Name = "Authorization",
                Description = "Nhập JWT access token theo dạng: Bearer {token}",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "bearerAuth",
                },
            };

            options.AddSecurityDefinition("bearerAuth", bearerScheme);
            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                { bearerScheme, Array.Empty<string>() },
            });
        });

        return services;
    }

    public static WebApplication UseBrainMemoSwaggerIfEnabled(this WebApplication app)
    {
        ArgumentNullException.ThrowIfNull(app);

        bool enabled = app.Configuration.GetValue<bool>("Swagger:Enabled") || app.Environment.IsDevelopment();
        if (!enabled)
        {
            return app;
        }

        app.UseSwagger();
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/swagger/v1/swagger.json", "BrainMemo LMS API v1");
        });

        return app;
    }
}

