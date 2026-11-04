using BrainMemo.Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Identity.Application.Interfaces;

public interface IIdentityDbContext
{
    DbSet<User> Users { get; }
    DbSet<UserRole> UserRoles { get; }
    DbSet<EmailOtp> EmailOtps { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}