using BrainMemo.Identity.Infrastructure.Data;
using BrainMemo.Curriculum.Infrastructure.Data;
using BrainMemo.Storage.Infrastructure.Data;
using BrainMemo.Assessment.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// 1. Đăng ký 4 DbContext độc lập trỏ vào 4 Schemas MySQL
var serverVersion = new MySqlServerVersion(new Version(8, 0, 36));

builder.Services.AddDbContext<IdentityDbContext>(options =>
    options.UseMySql(builder.Configuration.GetConnectionString("IdentityDb"), serverVersion));

builder.Services.AddDbContext<CurriculumDbContext>(options =>
    options.UseMySql(builder.Configuration.GetConnectionString("CurriculumDb"), serverVersion));

builder.Services.AddDbContext<StorageDbContext>(options =>
    options.UseMySql(builder.Configuration.GetConnectionString("StorageDb"), serverVersion));

builder.Services.AddDbContext<AssessmentDbContext>(options =>
    options.UseMySql(builder.Configuration.GetConnectionString("AssessmentDb"), serverVersion));

// 2. MediatR In-memory Event Bus
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblies(AppDomain.CurrentDomain.GetAssemblies()));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

// Bắt buộc phải có để map các Controller của module vào pipeline
app.MapControllers();

app.Run();