using System.Text;
using BrainMemo.Assessment.Infrastructure.Data;
using BrainMemo.Curriculum.Infrastructure.Data;
using BrainMemo.Identity.Application.Interfaces;
using BrainMemo.Identity.Application.Services;
using BrainMemo.Identity.Infrastructure.Data;
using BrainMemo.Storage.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. Cấu hình 4 DbContext độc lập trỏ vào MySQL
var serverVersion = new MySqlServerVersion(new Version(8, 0, 36));

builder.Services.AddDbContext<IdentityDbContext>(options =>
    options.UseMySql(builder.Configuration.GetConnectionString("IdentityDb"), serverVersion));

builder.Services.AddScoped<IIdentityDbContext>(provider => provider.GetRequiredService<IdentityDbContext>());

builder.Services.AddDbContext<CurriculumDbContext>(options =>
    options.UseMySql(builder.Configuration.GetConnectionString("CurriculumDb"), serverVersion));

builder.Services.AddDbContext<StorageDbContext>(options =>
    options.UseMySql(builder.Configuration.GetConnectionString("StorageDb"), serverVersion));

builder.Services.AddDbContext<AssessmentDbContext>(options =>
    options.UseMySql(builder.Configuration.GetConnectionString("AssessmentDb"), serverVersion));

// 2. Đăng ký Services của Module Identity
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAuthService, AuthService>();

// 3. Cấu hình Authentication & JWT Bearer
var jwtKey = builder.Configuration["Jwt:Key"] ?? "BrainMemo_Super_Secret_Key_LMS_2026_Minimum_32_Characters!";
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "BrainMemoApi",
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "BrainMemoClient",
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// 4. MediatR In-memory Event Bus
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblies(AppDomain.CurrentDomain.GetAssemblies()));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Cấu hình nút Authorize nhập Bearer Token trên Swagger UI
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "BrainMemo API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Nhập token JWT theo định dạng: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();